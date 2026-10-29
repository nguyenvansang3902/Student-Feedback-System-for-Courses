import { createHash } from "node:crypto";
import { fakerVI } from "@faker-js/faker";
import { hash } from "bcryptjs";
import { getDb } from "../../lib/db";
import { getAuthConfig } from "../../lib/env";
import type { Role, ScopeType } from "../../generated/prisma/enums";
import { authorizeConsole, type ServerConsoleActor } from "../policies/console";
import { lockAdminMutations } from "./access";
import { seedDemoSurveyData } from "./demo-survey-seed";
import { seedDefaultTemplate } from "./seed-template-default";
import { seedWeek7ReadinessData } from "./week7-demo-seed";

export const demoSizes = {
  small: {
    departments: 8,
    courses: 8,
    sections: 12,
    teachers: 6,
    students: 30,
  },
  medium: {
    departments: 8,
    courses: 40,
    sections: 120,
    teachers: 60,
    students: 1500,
  },
  large: {
    departments: 8,
    courses: 80,
    sections: 240,
    teachers: 120,
    students: 3000,
  },
} as const;
export type DemoSize = keyof typeof demoSizes;
export function demoId(key: string): string {
  const hex = createHash("sha256").update(`sfs-demo-v1:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Chỉ thêm dữ liệu giả còn thiếu; không đặt lại mật khẩu/trạng thái/quyền đã đổi. */
export async function seedDemo(
  actor: ServerConsoleActor | null,
  size: DemoSize,
) {
  authorizeConsole(actor);
  const config = getAuthConfig();
  if (
    !(size in demoSizes) ||
    process.env.NODE_ENV === "production" ||
    !["localhost", "127.0.0.1"].includes(
      new URL(config.databaseUrl).hostname,
    ) ||
    !["localhost", "127.0.0.1"].includes(new URL(config.appUrl).hostname)
  )
    throw new Error(
      "Seed demo chỉ cho size hợp lệ trong môi trường cục bộ, không production.",
    );
  const counts = demoSizes[size];
  const passwordHash = await hash("Demo2026!HocTap", config.bcryptCost);
  fakerVI.seed(20261022);
  const facultyNames = ["Công nghệ thông tin", "Kinh tế", "Ngôn ngữ"];
  const faculties = facultyNames.map((name, i) => ({
    id: demoId(`faculty:${i}`),
    code: `DEMO-K${i + 1}`,
    name: `Khoa ${name} (giả lập)`,
  }));
  const departments = Array.from({ length: counts.departments }, (_, i) => ({
    id: demoId(`department:${i}`),
    code: `DEMO-BM${i + 1}`,
    name: `Bộ môn minh họa ${i + 1}`,
    facultyId: faculties[i % 3].id,
  }));
  const courses = Array.from({ length: counts.courses }, (_, i) => ({
    id: demoId(`course:${i}`),
    code: `DEMO-MH${String(i + 1).padStart(3, "0")}`,
    name: `Môn học minh họa ${i + 1}`,
    credits: 3,
    departmentId: departments[i % departments.length].id,
  }));
  const semester = {
    id: demoId("semester:2026-1"),
    code: "DEMO-HK1-2026",
    name: "Học kỳ 1 2026–2027 (giả lập)",
    startsOn: new Date("2026-09-30T00:00:00Z"),
    endsOn: new Date("2027-01-15T00:00:00Z"),
  };
  const sections = Array.from({ length: counts.sections }, (_, i) => ({
    id: demoId(`section:${i}`),
    code: `DEMO-LHP${String(i + 1).padStart(3, "0")}`,
    courseId: courses[i % courses.length].id,
    semesterId: semester.id,
  }));
  const people = (kind: "SV" | "GV", count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: demoId(`${kind}:${i}`),
      loginCode: `DEMO-${kind}${String(i + 1).padStart(5, "0")}`,
      email: `${kind.toLowerCase()}${i + 1}@seed.demo.invalid`,
      displayName: fakerVI.person.fullName(),
      passwordHash,
      status: "ACTIVE" as const,
      mustChangePassword: false,
    }));
  const teachers = people("GV", counts.teachers),
    students = people("SV", counts.students);
  const operators = [
    {
      loginCode: "DBCL2026001",
      role: "CAN_BO_DBCL",
      scopeType: "GLOBAL",
      facultyId: null,
      departmentId: null,
    },
    {
      loginCode: "TK2026001",
      role: "TRUONG_KHOA",
      scopeType: "FACULTY",
      facultyId: faculties[0].id,
      departmentId: null,
    },
    {
      loginCode: "TBM2026001",
      role: "TRUONG_BO_MON",
      scopeType: "DEPARTMENT",
      facultyId: null,
      departmentId: departments[0].id,
    },
    {
      loginCode: "LD2026001",
      role: "LANH_DAO",
      scopeType: "GLOBAL",
      facultyId: null,
      departmentId: null,
    },
    ...(
      [
        ["PDT2026001", "PHONG_DAO_TAO"],
        ["KT2026001", "PHONG_KHAO_THI"],
        ["TT2026001", "THANH_TRA"],
        ["TT2026002", "THANH_TRA"],
      ] as const
    ).map(([loginCode, role]) => ({
      loginCode,
      role,
      scopeType: "GLOBAL" as const,
      facultyId: null,
      departmentId: null,
    })),
  ] as const;
  const operatorUsers = operators.map((p) => ({
    id: demoId(p.loginCode),
    loginCode: p.loginCode,
    email: `${p.loginCode.toLowerCase()}@seed.demo.invalid`,
    displayName: `Tài khoản minh họa ${p.role}`,
    passwordHash,
    status: "ACTIVE" as const,
    mustChangePassword: false,
  }));
  const db = getDb();
  return db.$transaction(
    async (tx) => {
      await lockAdminMutations(tx);
      // Phát hiện mã/email đã thuộc ID khác trước khi thêm bất kỳ dữ liệu nào.
      const checkCodes = async (
        records: { code: string; id: string }[],
        find: (codes: string[]) => Promise<{ code: string; id: string }[]>,
      ) => {
        const wanted = new Map(records.map((r) => [r.code, r.id]));
        const found = await find([...wanted.keys()]);
        if (found.some((r) => wanted.get(r.code) !== r.id))
          throw new Error(
            "Mã demo trùng dữ liệu hiện có; đã hủy toàn bộ seed.",
          );
      };
      await checkCodes(faculties, (codes) =>
        tx.faculty.findMany({
          where: { code: { in: codes } },
          select: { id: true, code: true },
        }),
      );
      await checkCodes(departments, (codes) =>
        tx.department.findMany({
          where: { code: { in: codes } },
          select: { id: true, code: true },
        }),
      );
      await checkCodes(courses, (codes) =>
        tx.course.findMany({
          where: { code: { in: codes } },
          select: { id: true, code: true },
        }),
      );
      await checkCodes([semester], (codes) =>
        tx.semester.findMany({
          where: { code: { in: codes } },
          select: { id: true, code: true },
        }),
      );
      const existingSemester = await tx.semester.findUnique({
        where: { id: semester.id },
      });
      if (existingSemester?.lockedAt)
        throw new Error(
          "Học kỳ demo đã khóa; seed không thay đổi dữ liệu học kỳ này.",
        );
      const sectionCodes = new Map(sections.map((r) => [r.code, r.id]));
      const existingSections = await tx.courseSection.findMany({
        where: {
          semesterId: semester.id,
          code: { in: [...sectionCodes.keys()] },
        },
      });
      if (existingSections.some((r) => sectionCodes.get(r.code) !== r.id))
        throw new Error("Mã lớp demo trùng dữ liệu hiện có.");
      const allUsers = [...teachers, ...students, ...operatorUsers];
      const wantedUsers = new Map(allUsers.map((r) => [r.loginCode, r]));
      const wantedEmails = new Map(allUsers.map((r) => [r.email, r.id]));
      const existingUsers = await tx.user.findMany({
        where: {
          OR: [
            { loginCode: { in: [...wantedUsers.keys()] } },
            { email: { in: [...wantedEmails.keys()] } },
          ],
        },
        select: { id: true, loginCode: true, email: true },
      });
      if (
        existingUsers.some(
          (r) =>
            wantedUsers.get(r.loginCode)?.id !== r.id ||
            wantedEmails.get(r.email) !== r.id,
        )
      )
        throw new Error(
          "Mã/email demo trùng hoặc đã đổi; giữ nguyên dữ liệu, hủy seed.",
        );
      const existingIds = new Set(existingUsers.map((u) => u.id));
      await tx.faculty.createMany({ data: faculties, skipDuplicates: true });
      await tx.department.createMany({
        data: departments,
        skipDuplicates: true,
      });
      await tx.course.createMany({ data: courses, skipDuplicates: true });
      await tx.semester.createMany({ data: [semester], skipDuplicates: true });
      await tx.courseSection.createMany({
        data: sections,
        skipDuplicates: true,
      });
      for (let offset = 0; offset < allUsers.length; offset += 300)
        await tx.user.createMany({
          data: allUsers
            .slice(offset, offset + 300)
            .filter((u) => !existingIds.has(u.id)),
        });
      const grants: {
        userId: string;
        role: Role;
        scopeType: ScopeType;
        scopeKey: string;
        facultyId?: string | null;
        departmentId?: string | null;
      }[] = [
        ...teachers.map((u) => ({
          userId: u.id,
          role: "GIANG_VIEN" as const,
          scopeType: "GLOBAL" as const,
          scopeKey: "GLOBAL",
        })),
        ...students.map((u) => ({
          userId: u.id,
          role: "SINH_VIEN" as const,
          scopeType: "GLOBAL" as const,
          scopeKey: "GLOBAL",
        })),
        ...operators.map((p) => ({
          userId: demoId(p.loginCode),
          role: p.role,
          scopeType: p.scopeType,
          scopeKey: p.facultyId
            ? `FACULTY:${p.facultyId}`
            : p.departmentId
              ? `DEPARTMENT:${p.departmentId}`
              : "GLOBAL",
          facultyId: p.facultyId,
          departmentId: p.departmentId,
        })),
      ].filter((p) => !existingIds.has(p.userId));
      for (let offset = 0; offset < grants.length; offset += 300)
        await tx.roleAssignment.createMany({
          data: grants.slice(offset, offset + 300),
        });
      const led = new Set(
        (
          await tx.teachingAssignment.findMany({
            where: {
              sectionId: { in: sections.map((s) => s.id) },
              isLead: true,
            },
            select: { sectionId: true },
          })
        ).map((a) => a.sectionId),
      );
      const teaching = sections
        .filter((s) => !led.has(s.id))
        .map((s) => ({
          sectionId: s.id,
          teacherId: teachers[sections.indexOf(s) % teachers.length].id,
          isLead: true,
        }));
      const enrollments = students.flatMap((u, i) =>
        Array.from({ length: 3 }, (_, j) => ({
          id: demoId(`enrollment:${i}:${j}`),
          studentId: u.id,
          sectionId: sections[(i * 3 + j) % sections.length].id,
          registeredAt: semester.startsOn,
        })),
      );
      // Hai tài khoản auth cũ có lớp để xem mà không đổi mật khẩu/quyền/trạng thái.
      for (const code of ["SV2026001", "GV2026001"]) {
        const user = await tx.user.findUnique({
          where: { loginCode: code },
          include: { roles: true },
        });
        if (
          user?.email ===
          (code.startsWith("SV")
            ? "sinhvien@demo.invalid"
            : "giangvien@demo.invalid")
        ) {
          if (
            code.startsWith("SV") &&
            user.roles.some((r) => r.role === "SINH_VIEN")
          )
            enrollments.push({
              id: demoId("primary-enrollment"),
              studentId: user.id,
              sectionId: sections[0].id,
              registeredAt: semester.startsOn,
            });
          if (
            code.startsWith("GV") &&
            user.roles.some((r) => r.role === "GIANG_VIEN")
          )
            teaching.push({
              sectionId: sections[0].id,
              teacherId: user.id,
              isLead: false,
            });
        }
      }
      await tx.teachingAssignment.createMany({
        data: teaching,
        skipDuplicates: true,
      });
      for (let offset = 0; offset < enrollments.length; offset += 500)
        await tx.enrollment.createMany({
          data: enrollments.slice(offset, offset + 500),
          skipDuplicates: true,
        });
      const surveyData = await seedDemoSurveyData(
        actor,
        tx,
        {
          id: demoId,
          teacherId: teachers[0].id,
          studentIds: students.map((u) => u.id),
          sectionIds: sections.map((s) => s.id),
          semesterId: semester.id,
          createdById: demoId("DBCL2026001"),
          approvedById: demoId("LD2026001"),
        },
        size,
      );
      await seedDefaultTemplate(actor, tx, {
        id: demoId,
        createdById: demoId("DBCL2026001"),
        legacyDefaultId: demoId("survey-data:template"),
      });
      const readinessData = await seedWeek7ReadinessData(actor, tx, {
        id: demoId,
        departmentId: departments[0].id,
        teacherIds: teachers.map((teacher) => teacher.id),
        studentIds: students.map((student) => student.id),
        createdById: demoId("DBCL2026001"),
        templateId: demoId("amendment1-default-template"),
      });
      await tx.auditLog.create({
        data: {
          actorId: null,
          action: "DEMO_SEEDED",
          objectType: "System",
          redactedSummary: {
            console: true,
            size,
            newUsers: allUsers.length - existingIds.size,
            futureModules: true,
          },
        },
      });
      return {
        size,
        faculties: faculties.length,
        ...counts,
        enrollments: enrollments.length,
        surveyData,
        readinessData,
      };
    },
    { maxWait: 15000, timeout: 60000 },
  );
}
