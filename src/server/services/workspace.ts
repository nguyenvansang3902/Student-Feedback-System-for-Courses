import type { Prisma } from "../../generated/prisma/client";
import { getDb } from "../../lib/db";
import { AuthError, type AuthActor } from "../auth/types";
import { requireCan, sectionScopeWhere } from "../policies/can";
import { assertFreshActor, objectId, pageInput, parseInput } from "./access";

const sectionSelect = {
  id: true, code: true,
  course: { select: { id: true, code: true, name: true, department: { select: {
    id: true, code: true, name: true, faculty: { select: { id: true, code: true, name: true } },
  } } } },
  semester: { select: { id: true, code: true, name: true } },
} satisfies Prisma.CourseSectionSelect;

type SelectedSection = Prisma.CourseSectionGetPayload<{ select: typeof sectionSelect }>;
function sectionDto(section: SelectedSection) {
  const { department, ...course } = section.course;
  const { faculty, ...unit } = department;
  return { id: section.id, code: section.code, course, semester: section.semester, department: unit, faculty };
}

/** Chỉ xem danh mục lớp tối thiểu để nghiệm thu phạm vi, chưa có kết quả/khảo sát. */
export async function listWorkspaceSections(actor: AuthActor, input: { page?: number; pageSize?: number } = {}) {
  requireCan(actor, "sections:list");
  const { page, pageSize } = parseInput(pageInput.strict(), input);
  return getDb().$transaction(async (tx) => {
    const fresh = await assertFreshActor(tx, actor);
    requireCan(fresh, "sections:list");
    const where = sectionScopeWhere(fresh);
    const [items, total] = await Promise.all([
      tx.courseSection.findMany({ where, select: sectionSelect, orderBy: [{ code: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
      tx.courseSection.count({ where }),
    ]);
    return { items: items.map(sectionDto), page, pageSize, total };
  });
}

export async function getWorkspaceSection(actor: AuthActor, id: string) {
  requireCan(actor, "sections:read");
  const sectionId = parseInput(objectId, id);
  return getDb().$transaction(async (tx) => {
    const fresh = await assertFreshActor(tx, actor);
    requireCan(fresh, "sections:read");
    const section = await tx.courseSection.findFirst({
      where: { AND: [{ id: sectionId }, sectionScopeWhere(fresh)] }, select: sectionSelect,
    });
    if (!section) throw new AuthError("Không tìm thấy lớp học phần trong phạm vi của bạn.", 404, "NOT_FOUND");
    return sectionDto(section);
  });
}
