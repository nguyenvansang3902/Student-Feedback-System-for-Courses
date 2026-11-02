import type { Prisma } from "../../generated/prisma/client";
import type { Role } from "../../generated/prisma/enums";
import { getDb } from "../../lib/db";
import { actorGrants, isValidGrant } from "../policies/can";
import {
  isInspectionOfficer,
  roleMatchesActiveFeedbackSection,
} from "../policies/feedback";
import { authorizeConsole, type ServerConsoleActor } from "../policies/console";
import type { AuthActor } from "../auth/types";
import { lockAdminMutations } from "./access";
import { readWorkflowSettings } from "./workflow-settings";
import { addBusinessDays, feedbackOverdue } from "./feedback-deadlines";
import { enqueueDomainNotice } from "./domain-notifications";

export function escalationChain(category: string): Role[] {
  if (["THI_KET_THUC_HOC_PHAN", "TO_CHUC_LOP_HOC"].includes(category))
    return [
      category === "TO_CHUC_LOP_HOC" ? "PHONG_DAO_TAO" : "PHONG_KHAO_THI",
      "CAN_BO_DBCL",
      "LANH_DAO",
    ];
  if (category === "KHAC") return ["CAN_BO_DBCL", "LANH_DAO"];
  return ["GIANG_VIEN", "TRUONG_BO_MON", "TRUONG_KHOA", "CAN_BO_DBCL"];
}
function identity(user: {
  id: string;
  roles: Prisma.RoleAssignmentGetPayload<object>[];
}): AuthActor {
  const assignments = user.roles.filter(isValidGrant);
  return {
    userId: user.id,
    roles: [...new Set(assignments.map((x) => x.role))],
    assignments,
    sessionId: "",
    familyId: "",
    loginCode: "",
    displayName: "",
    email: "",
    mfa: true,
    purpose: "FULL",
    mustChangePassword: false,
  };
}
const sectionInclude = {
  course: { include: { department: { include: { faculty: true } } } },
  semester: true,
  teaching: true,
} as const;
export async function ensureDueFeedback(
  actor: ServerConsoleActor | null,
  input: { limit?: number; now?: Date } = {},
) {
  authorizeConsole(actor);
  const limit = Math.min(100, Math.max(1, input.limit ?? 50)),
    now = input.now ?? new Date();
  return getDb().$transaction(
    async (tx) => {
      await lockAdminMutations(tx);
      const settings = await readWorkflowSettings(tx);
      const horizon = new Date(now.getTime() + 86400000);
      const day = new Date(now.getTime() + 7 * 3600000)
        .toISOString()
        .slice(0, 10);
      const cursorValue = await tx.systemSetting.findUnique({
        where: { key: "FEEDBACK_SLA_CURSOR" },
        select: { value: true },
      });
      const cursor =
        typeof cursorValue?.value === "string" ? cursorValue.value : "";
      const rows = await tx.feedback.findMany({
        where: {
          ...(cursor ? { id: { gt: cursor } } : {}),
          status: { in: ["MOI", "DA_TIEP_NHAN", "DANG_XU_LY"] },
          section: { semester: { lockedAt: null } },
          OR: [
            { acceptDueAt: { lte: horizon } },
            { replyDueAt: { lte: horizon } },
          ],
        },
        include: {
          section: { include: sectionInclude },
          recipients: true,
          inspectionCase: true,
          escalations: { orderBy: { level: "desc" }, take: 1 },
        },
        orderBy: [{ id: "asc" }],
        take: limit,
      });
      const nextCursor = rows.length === limit ? rows.at(-1)!.id : "";
      await tx.systemSetting.upsert({
        where: { key: "FEEDBACK_SLA_CURSOR" },
        create: { key: "FEEDBACK_SLA_CURSOR", value: nextCursor },
        update: { value: nextCursor },
      });
      const users = await tx.user.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          roles: {
            where: {
              OR: [
                { scopeType: "GLOBAL" },
                {
                  scopeType: "DEPARTMENT",
                  department: { isActive: true, faculty: { isActive: true } },
                },
                { scopeType: "FACULTY", faculty: { isActive: true } },
              ],
            },
          },
        },
      });
      let escalated = 0,
        overdue = 0;
      for (const row of rows) {
        if (row.inspectionCase && row.inspectionCase.status !== "CHUYEN_LAI")
          continue;
        const due =
          row.status === "MOI" && row.acceptDueAt < row.replyDueAt
            ? row.acceptDueAt
            : row.replyDueAt;
        if (due <= horizon)
          await enqueueDomainNotice(tx, {
            key: `feedback-due:${row.id}:${day}`,
            targetType: "Feedback",
            targetId: row.id,
            title: feedbackOverdue(row, now)
              ? "Phản hồi quá hạn"
              : "Phản hồi sắp đến hạn",
            body: "Có phản hồi cần xử lý theo thời hạn. Đăng nhập để xem.",
            userIds: row.recipients
              .filter((x) => x.isActive && x.isPrimary)
              .map((x) => x.userId),
          });
        if (!feedbackOverdue(row, now)) continue;
        overdue++;
        await tx.feedback.updateMany({
          where: { id: row.id, revision: row.revision },
          data: { isOverdue: true },
        });
        const previous = row.escalations[0];
        if (
          previous &&
          now <= addBusinessDays(previous.processedAt, settings.escalationDays)
        )
          continue;
        const chain = escalationChain(row.category);
        const currentRoles = row.recipients
          .filter((x) => x.isPrimary && x.isActive)
          .map((x) => x.accessRole);
        const current = Math.max(
          -1,
          ...currentRoles.map((r) => chain.indexOf(r as Role)),
        );
        const next = chain[current + 1];
        if (!next) continue;
        const context = {
          departmentId: row.section.course.departmentId,
          facultyId: row.section.course.department.facultyId,
          teacherIds: row.section.teaching.map((x) => x.teacherId),
          departmentActive: row.section.course.department.isActive,
          facultyActive: row.section.course.department.faculty.isActive,
        };
        const targets = users
          .filter((u) => u.id !== row.authorId)
          .filter((u) => {
            const a = identity(u);
            return (
              !a.roles.includes("ADMIN") &&
              actorGrants(a).some(
                (g) =>
                  g.role === next &&
                  roleMatchesActiveFeedbackSection(g, u.id, context),
              )
            );
          });
        if (!targets.length) continue;
        const level = row.escalationLevel + 1;
        const marker = await tx.slaEscalation.createMany({
          data: [{ feedbackId: row.id, level, processedAt: now }],
          skipDuplicates: true,
        });
        if (!marker.count) continue;
        await tx.feedbackRecipient.updateMany({
          where: { feedbackId: row.id },
          data: { isActive: false, isPrimary: false },
        });
        for (const target of targets)
          await tx.feedbackRecipient.upsert({
            where: {
              feedbackId_userId: { feedbackId: row.id, userId: target.id },
            },
            create: {
              feedbackId: row.id,
              userId: target.id,
              accessRole: next,
              isPrimary: true,
              isActive: true,
            },
            update: { accessRole: next, isPrimary: true, isActive: true },
          });
        await tx.feedback.update({
          where: { id: row.id },
          data: {
            assigneeId: targets[0].id,
            escalationLevel: level,
            revision: { increment: 1 },
          },
        });
        await tx.feedbackHistory.create({
          data: {
            feedbackId: row.id,
            event: "LEO_THANG",
            fromStatus: row.status,
            toStatus: row.status,
            fromAssigneeId: row.assigneeId,
            toAssigneeId: targets[0].id,
            reason: "Quá hạn xử lý theo cấu hình SLA.",
            occurredAt: now,
          },
        });
        await enqueueDomainNotice(tx, {
          key: `feedback-escalation:${row.id}:${level}`,
          targetType: "Feedback",
          targetId: row.id,
          title: "Phản hồi quá hạn",
          body: "Có phản hồi quá hạn được chuyển đến đơn vị xử lý. Đăng nhập để xem.",
          userIds: targets.map((x) => x.id),
        });
        await tx.auditLog.create({
          data: {
            action: "FEEDBACK_ESCALATED",
            objectType: "Feedback",
            objectId: row.id,
            redactedSummary: { level, recipientCount: targets.length },
          },
        });
        escalated++;
      }
      const caseCursorValue = await tx.systemSetting.findUnique({
        where: { key: "INSPECTION_SLA_CURSOR" },
        select: { value: true },
      });
      const caseCursor =
        typeof caseCursorValue?.value === "string" ? caseCursorValue.value : "";
      const cases = await tx.inspectionCase.findMany({
        where: {
          ...(caseCursor ? { id: { gt: caseCursor } } : {}),
          status: { notIn: ["DONG", "TU_CHOI", "CHUYEN_LAI"] },
          section: { semester: { lockedAt: null } },
          OR: [
            { acceptedAt: null, acceptDueAt: { lt: now } },
            { completeDueAt: { lt: now } },
          ],
        },
        include: { section: { include: sectionInclude } },
        orderBy: [{ id: "asc" }],
        take: limit,
      });
      const nextCaseCursor = cases.length === limit ? cases.at(-1)!.id : "";
      await tx.systemSetting.upsert({
        where: { key: "INSPECTION_SLA_CURSOR" },
        create: { key: "INSPECTION_SLA_CURSOR", value: nextCaseCursor },
        update: { value: nextCaseCursor },
      });
      for (const row of cases) {
        const context = {
          departmentId: row.section.course.departmentId,
          facultyId: row.section.course.department.facultyId,
          teacherIds: row.section.teaching.map((x) => x.teacherId),
        };
        const targets = users.filter((u) => {
          const a = identity(u);
          return (
            !a.roles.includes("ADMIN") &&
            !a.roles.includes("CAN_BO_DBCL") &&
            ((a.roles.includes("LANH_DAO") &&
              !context.teacherIds.includes(u.id) &&
              !actorGrants(a).some(
                (g) =>
                  (g.role === "TRUONG_BO_MON" &&
                    g.departmentId === context.departmentId) ||
                  (g.role === "TRUONG_KHOA" &&
                    g.facultyId === context.facultyId),
              )) ||
              isInspectionOfficer(a, context))
          );
        });
        await enqueueDomainNotice(tx, {
          key: `inspection-overdue:${row.id}:${row.acceptedAt ? "completion" : "acceptance"}`,
          targetType: "InspectionCase",
          targetId: row.id,
          title: "Hồ sơ quá hạn",
          body: "Có hồ sơ quá hạn cần xem xét. Đăng nhập để xem thông tin theo quyền được cấp.",
          userIds: targets.map((x) => x.id),
        });
      }
      return {
        checked: rows.length,
        overdue,
        escalated,
        inspectionOverdue: cases.length,
      };
    },
    { maxWait: 15000, timeout: 30000 },
  );
}
