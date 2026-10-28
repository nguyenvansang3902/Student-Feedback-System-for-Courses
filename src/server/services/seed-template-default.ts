import type { Prisma } from "../../generated/prisma/client";
import { authorizeConsole, type ServerConsoleActor } from "../policies/console";
import {
  parseTemplateInput,
  templateInputSchema,
  type TemplateInput,
} from "./template-input";

export const defaultTemplateInput: TemplateInput = {
  name: "Mẫu khảo sát môn học mặc định — đủ loại câu",
  groups: [
    {
      title: "Trải nghiệm học tập",
      position: 1,
      weight: 2,
      questions: [
        {
          label: "Giảng viên trình bày nội dung rõ ràng",
          type: "LIKERT",
          position: 1,
          weight: 1,
          required: true,
          allowNA: true,
          scaleMin: 1,
          scaleMax: 5,
        },
        {
          label: "Hoạt động học tập hỗ trợ bạn hiểu bài",
          type: "LIKERT",
          position: 2,
          weight: 2,
          required: true,
          allowNA: false,
          scaleMin: 1,
          scaleMax: 4,
        },
        {
          label: "Hình thức học tập hỗ trợ bạn tốt nhất",
          type: "SINGLE_CHOICE",
          position: 3,
          required: true,
          allowNA: true,
          options: [
            { label: "Thảo luận trên lớp", position: 1 },
            { label: "Thực hành", position: 2 },
            { label: "Tự học có hướng dẫn", position: 3 },
          ],
        },
        {
          label: "Những tài liệu bạn đã sử dụng",
          type: "MULTIPLE_CHOICE",
          position: 4,
          required: false,
          allowNA: true,
          options: [
            { label: "Giáo trình", position: 1 },
            { label: "Bài giảng", position: 2 },
            { label: "Tài liệu tham khảo", position: 3 },
          ],
        },
      ],
    },
    {
      title: "Góp ý cải thiện",
      position: 2,
      weight: 1,
      questions: [
        {
          label: "Bạn có được thông báo rõ tiêu chí đánh giá không?",
          type: "BOOLEAN",
          position: 1,
          required: true,
          allowNA: true,
        },
        {
          label: "Đề xuất của bạn để cải thiện môn học",
          type: "TEXT",
          position: 2,
          required: false,
          allowNA: false,
        },
      ],
    },
  ],
};

/** Caller giữ mutex ngay từ đầu transaction; không sửa nội dung mẫu/câu hỏi đã khóa. */
export async function seedDefaultTemplate(
  actor: ServerConsoleActor | null,
  tx: Prisma.TransactionClient,
  context: {
    id: (key: string) => string;
    createdById: string;
    legacyDefaultId: string;
  },
) {
  authorizeConsole(actor);
  if (process.env.NODE_ENV === "production")
    throw new Error("Mẫu demo chỉ được seed trong môi trường phát triển.");
  const id = context.id("week6-default-template"),
    existing = await tx.surveyTemplate.findUnique({
      where: { id },
      select: { id: true },
    });
  if (existing) return;
  const input = parseTemplateInput(templateInputSchema, defaultTemplateInput);
  const selected = await tx.surveyTemplate.findMany({
    where: { isDefault: true },
    select: { id: true },
  });
  const promote =
    selected.length === 0 ||
    (selected.length === 1 && selected[0].id === context.legacyDefaultId);
  if (promote)
    await tx.surveyTemplate.updateMany({
      where: { id: context.legacyDefaultId, isDefault: true },
      data: { isDefault: false, revision: { increment: 1 } },
    });
  await tx.surveyTemplate.create({
    data: {
      id,
      familyId: context.id("week6-default-family"),
      version: 1,
      name: input.name,
      status: "DA_KHOA",
      lockedAt: new Date(),
      isDefault: promote,
      createdById: context.createdById,
      groups: {
        create: input.groups.map((group, gi) => ({
          id: context.id(`week6-default-group:${gi}`),
          title: group.title,
          position: group.position,
          weight: group.weight,
          questions: {
            create: group.questions.map((question, qi) => ({
              id: context.id(`week6-default-question:${gi}:${qi}`),
              label: question.label,
              type: question.type,
              position: question.position,
              weight: question.weight,
              required: question.required,
              allowNA: question.allowNA,
              scaleMin:
                question.type === "LIKERT" ? (question.scaleMin ?? 1) : null,
              scaleMax:
                question.type === "LIKERT" ? (question.scaleMax ?? 5) : null,
              options: {
                create: question.options.map((option, oi) => ({
                  id: context.id(`week6-default-option:${gi}:${qi}:${oi}`),
                  label: option.label,
                  position: option.position,
                })),
              },
            })),
          },
        })),
      },
    },
  });
  await tx.auditLog.create({
    data: {
      actorId: null,
      action: "DEFAULT_TEMPLATE_SEEDED",
      objectType: "SurveyTemplate",
      objectId: id,
      redactedSummary: {
        console: true,
        isDefault: promote,
        groupCount: input.groups.length,
        questionCount: input.groups.reduce(
          (count, group) => count + group.questions.length,
          0,
        ),
      },
    },
  });
}
