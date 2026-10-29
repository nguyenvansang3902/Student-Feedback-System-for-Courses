import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import { AuthError } from "../auth/types";
import { authorizeConsole, type ServerConsoleActor } from "../policies/console";
import { lockAdminMutations, objectId, parseInput } from "./access";
import { enqueueCampaignNotice } from "./campaign-notifications";
import { resolveCampaignCohort } from "./campaign-readiness";

export interface CampaignLifecycleResult {
  campaignId: string;
  opened: boolean;
  closed: boolean;
  driftDetected: boolean;
  blocked:
    | "SEMESTER_LOCKED"
    | "MISSING_APPROVAL"
    | "MISSING_CONFIRMATION"
    | "COHORT_ALREADY_EXISTS"
    | null;
}
const includeSemester = { semester: { select: { lockedAt: true } } } as const;
export const dueCampaignWhere = (
  now: Date,
): Prisma.SurveyCampaignWhereInput => ({
  OR: [
    { status: "DA_DUYET", startsAt: { lte: now } },
    { status: "DANG_MO", endsAt: { lte: now } },
  ],
});

/** Caller holds ADMIN_MUTATION_LOCK; all cohort/state/history changes share its transaction. */
export async function advanceCampaignState(
  tx: Prisma.TransactionClient,
  id: string,
  now = new Date(),
): Promise<CampaignLifecycleResult> {
  let campaign = await tx.surveyCampaign.findUnique({
    where: { id },
    include: includeSemester,
  });
  if (!campaign)
    throw new AuthError(
      "Không tìm thấy đợt khảo sát.",
      404,
      "CAMPAIGN_NOT_FOUND",
    );
  const result: CampaignLifecycleResult = {
    campaignId: id,
    opened: false,
    closed: false,
    driftDetected: false,
    blocked: null,
  };
  if (
    campaign.status === "DA_DUYET" &&
    campaign.startsAt.getTime() <= now.getTime()
  ) {
    if (campaign.semester.lockedAt)
      return { ...result, blocked: "SEMESTER_LOCKED" };
    if (!campaign.approvedAt || !campaign.approvedById)
      return { ...result, blocked: "MISSING_APPROVAL" };
    const confirmation = await tx.campaignDataConfirmation.findFirst({
      where: { campaignId: id },
      orderBy: { campaignRevision: "desc" },
    });
    if (
      !confirmation ||
      confirmation.status !== "DA_XAC_NHAN" ||
      confirmation.campaignRevision !== campaign.revision - 1
    )
      return { ...result, blocked: "MISSING_CONFIRMATION" };
    if (await tx.surveyTask.count({ where: { campaignId: id } }))
      return { ...result, blocked: "COHORT_ALREADY_EXISTS" };
    const cohort = await resolveCampaignCohort(tx, campaign);
    const driftDetected = cohort.snapshotHash !== confirmation.snapshotHash;
    const changed = await tx.surveyCampaign.updateMany({
      where: {
        id,
        status: "DA_DUYET",
        revision: campaign.revision,
        startsAt: { lte: now },
      },
      data: {
        status: "DANG_MO",
        revision: { increment: 1 },
        openedAt: now,
        openedSnapshotHash: cohort.snapshotHash,
        dataDriftDetected: driftDetected,
      },
    });
    if (changed.count !== 1) return result;
    const sectionIds = cohort.sections.map((section) => section.id);
    await tx.campaignSection.deleteMany({
      where: {
        campaignId: id,
        ...(sectionIds.length ? { sectionId: { notIn: sectionIds } } : {}),
      },
    });
    if (sectionIds.length)
      await tx.campaignSection.createMany({
        data: sectionIds.map((sectionId) => ({ campaignId: id, sectionId })),
        skipDuplicates: true,
      });
    for (let offset = 0; offset < cohort.pairs.length; offset += 500) {
      await tx.surveyTask.createMany({
        data: cohort.pairs
          .slice(offset, offset + 500)
          .map((pair) => ({
            id: randomUUID(),
            campaignId: id,
            sectionId: pair.sectionId,
            studentId: pair.studentId,
            status: "PENDING",
            doneDate: null,
          })),
      });
    }
    const nextRevision = campaign.revision + 1;
    await tx.campaignHistory.create({
      data: {
        campaignId: id,
        actorId: null,
        fromStatus: "DA_DUYET",
        toStatus: "DANG_MO",
        action: "AUTO_OPEN",
        campaignRevision: nextRevision,
        occurredAt: now,
        reason: driftDetected
          ? "Mở tự động; dữ liệu thay đổi sau khi xác nhận, đã chốt danh sách hiện tại và tạo cảnh báo."
          : "Mở tự động và chốt danh sách hiện tại.",
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: null,
        action: "CAMPAIGN_OPENED",
        objectType: "SurveyCampaign",
        objectId: id,
        redactedSummary: {
          success: true,
          revision: nextRevision,
          status: "DANG_MO",
          sectionCount: sectionIds.length,
          pairCount: cohort.pairs.length,
          dataDriftDetected: driftDetected,
        },
      },
    });
    if (driftDetected) {
      await tx.auditLog.create({
        data: {
          actorId: null,
          action: "CAMPAIGN_DATA_DRIFT",
          objectType: "SurveyCampaign",
          objectId: id,
          redactedSummary: {
            success: true,
            revision: nextRevision,
            sectionCount: sectionIds.length,
            pairCount: cohort.pairs.length,
            dataDriftDetected: true,
          },
        },
      });
      const recipients = await tx.user.findMany({
        where: {
          status: "ACTIVE",
          roles: {
            some: {
              role: { in: ["PHONG_DAO_TAO", "CAN_BO_DBCL"] },
              scopeType: "GLOBAL",
              scopeKey: "GLOBAL",
              facultyId: null,
              departmentId: null,
            },
          },
        },
        select: { id: true },
      });
      await enqueueCampaignNotice(tx, {
        key: `campaign-drift:${id}:${nextRevision}`,
        campaignId: id,
        title: "Dữ liệu thay đổi sau khi xác nhận",
        body: `Đợt “${campaign.title}” đã chốt theo dữ liệu hiện tại: ${sectionIds.length} lớp, ${cohort.pairs.length} cặp sinh viên/lớp. Phòng Đào tạo và ĐBCL cần kiểm tra thay đổi.`,
        userIds: recipients.map((user) => user.id),
      });
    }
    result.opened = true;
    result.driftDetected = driftDetected;
    campaign = await tx.surveyCampaign.findUniqueOrThrow({
      where: { id },
      include: includeSemester,
    });
  }
  // Catch up both transitions when the scheduler was absent for the whole window.
  if (
    campaign.status === "DANG_MO" &&
    campaign.endsAt.getTime() <= now.getTime()
  ) {
    const changed = await tx.surveyCampaign.updateMany({
      where: {
        id,
        status: "DANG_MO",
        revision: campaign.revision,
        endsAt: { lte: now },
      },
      data: { status: "DA_DONG", revision: { increment: 1 } },
    });
    if (changed.count === 1) {
      await tx.campaignHistory.create({
        data: {
          campaignId: id,
          actorId: null,
          fromStatus: "DANG_MO",
          toStatus: "DA_DONG",
          action: "AUTO_CLOSE",
          campaignRevision: campaign.revision + 1,
          occurredAt: now,
          reason: "Đóng tự động khi kết thúc thời gian khảo sát.",
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: null,
          action: "CAMPAIGN_CLOSED",
          objectType: "SurveyCampaign",
          objectId: id,
          redactedSummary: {
            success: true,
            revision: campaign.revision + 1,
            status: "DA_DONG",
          },
        },
      });
      result.closed = true;
    }
  }
  return result;
}

export async function advanceDueCampaignsInTransaction(
  tx: Prisma.TransactionClient,
  now = new Date(),
  limit = 20,
): Promise<CampaignLifecycleResult[]> {
  const results: CampaignLifecycleResult[] = [];
  let afterId: string | undefined;
  // limit is a page size, not a correctness cap: list/count filters must see all
  // states due at this instant even without a scheduler or behind blocked rows.
  while (true) {
    const rows = await tx.surveyCampaign.findMany({
      where: {
        AND: [
          dueCampaignWhere(now),
          ...(afterId ? [{ id: { gt: afterId } }] : []),
        ],
      },
      select: { id: true },
      orderBy: { id: "asc" },
      take: limit,
    });
    if (!rows.length) break;
    for (const row of rows)
      results.push(await advanceCampaignState(tx, row.id, now));
    afterId = rows.at(-1)!.id;
    if (rows.length < limit) break;
  }
  return results;
}

export async function ensureCampaignState(
  actor: ServerConsoleActor | null,
  id: string,
): Promise<CampaignLifecycleResult> {
  authorizeConsole(actor);
  const key = parseInput(objectId, id);
  return getDb().$transaction(
    async (tx) => {
      await lockAdminMutations(tx);
      return advanceCampaignState(tx, key);
    },
    { maxWait: 15000, timeout: 30000 },
  );
}
export async function ensureDueCampaigns(
  actor: ServerConsoleActor | null,
  input: { limit?: number } = {},
) {
  authorizeConsole(actor);
  const { limit } = parseInput(
    z.object({ limit: z.number().int().min(1).max(100).default(20) }).strict(),
    input,
  );
  const results: CampaignLifecycleResult[] = [];
  let afterId: string | undefined,
    transitioned = 0;
  const now = new Date();
  while (transitioned < limit) {
    const rows = await getDb().surveyCampaign.findMany({
      where: {
        AND: [
          dueCampaignWhere(now),
          ...(afterId ? [{ id: { gt: afterId } }] : []),
        ],
      },
      select: { id: true },
      orderBy: { id: "asc" },
      take: limit,
    });
    if (!rows.length) break;
    for (const row of rows) {
      const result = await ensureCampaignState(actor, row.id);
      results.push(result);
      afterId = row.id;
      if (result.opened || result.closed) transitioned++;
      if (transitioned >= limit) break;
    }
    if (rows.length < limit) break;
  }
  return {
    checked: results.length,
    opened: results.filter((row) => row.opened).length,
    closed: results.filter((row) => row.closed).length,
    blocked: results.filter((row) => row.blocked).length,
    items: results,
  };
}
