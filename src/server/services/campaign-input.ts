import { z } from "zod";
import { CampaignScope, CampaignStatus } from "../../generated/prisma/enums";
import { AuthError } from "../auth/types";
import { objectId, pageInput, parseInput } from "./access";

export const CAMPAIGN_LIMITS = {
  explicitSections: 1000,
  title: 200,
  reason: 1000,
  history: 100,
} as const;
const timestamp = z.iso.datetime({ offset: true });
const scopeFields = {
  title: z.string().trim().min(1).max(CAMPAIGN_LIMITS.title),
  semesterId: objectId,
  templateId: objectId,
  scope: z.enum(CampaignScope),
  facultyId: objectId.nullable().optional(),
  departmentId: objectId.nullable().optional(),
  sectionIds: z
    .array(objectId)
    .max(CAMPAIGN_LIMITS.explicitSections)
    .default([]),
  startsAt: timestamp,
  endsAt: timestamp,
  minResponses: z.number().int().min(1).max(10000),
  minRate: z.number().min(0).max(1),
  warningScore: z.number().min(1).max(5),
  explanationDays: z.number().int().min(1).max(365),
  mandatory: z.boolean().default(false),
};
function validateScope(
  input: {
    scope: string;
    facultyId?: string | null;
    departmentId?: string | null;
    sectionIds: string[];
    startsAt: string;
    endsAt: string;
  },
  context: z.RefinementCtx,
) {
  if (new Date(input.startsAt).getTime() >= new Date(input.endsAt).getTime())
    context.addIssue({
      code: "custom",
      message: "Thời điểm kết thúc phải sau thời điểm bắt đầu.",
      path: ["endsAt"],
    });
  if (new Set(input.sectionIds).size !== input.sectionIds.length)
    context.addIssue({
      code: "custom",
      message: "Danh sách lớp học phần bị trùng.",
      path: ["sectionIds"],
    });
  const valid =
    input.scope === "GLOBAL"
      ? !input.facultyId && !input.departmentId && !input.sectionIds.length
      : input.scope === "FACULTY"
        ? !!input.facultyId && !input.departmentId && !input.sectionIds.length
        : input.scope === "DEPARTMENT"
          ? !!input.departmentId && !input.facultyId && !input.sectionIds.length
          : !input.facultyId &&
            !input.departmentId &&
            input.sectionIds.length > 0;
  if (!valid)
    context.addIssue({
      code: "custom",
      message: "Phạm vi và danh sách lớp/khoa/bộ môn không phù hợp.",
      path: ["scope"],
    });
}
export const campaignInputSchema = z
  .object(scopeFields)
  .strict()
  .superRefine(validateScope);
export const campaignUpdateSchema = z
  .object({
    ...scopeFields,
    expectedRevision: z.number().int().min(1),
    requestId: objectId.optional(),
  })
  .strict()
  .superRefine(validateScope);
export const campaignActionSchema = z
  .object({
    expectedRevision: z.number().int().min(1),
    requestId: objectId,
    reason: z.string().trim().min(1).max(CAMPAIGN_LIMITS.reason).optional(),
    endsAt: timestamp.optional(),
  })
  .strict();
export const campaignListSchema = pageInput
  .extend({
    search: z.string().trim().max(100).optional(),
    status: z.enum(CampaignStatus).optional(),
    semesterId: objectId.optional(),
  })
  .strict();
export const campaignOptionSchema = pageInput
  .extend({
    kind: z.enum([
      "semesters",
      "templates",
      "faculties",
      "departments",
      "sections",
    ]),
    search: z.string().trim().max(100).optional(),
    semesterId: objectId.optional(),
  })
  .strict();
export type ValidatedCampaignInput = z.output<typeof campaignInputSchema>;
export function parseCampaignInput<T>(schema: z.ZodType<T>, value: unknown): T {
  return parseInput(schema, value);
}
export function requireCampaignReason(reason: string | undefined): string {
  if (!reason || reason.trim().length < 10)
    throw new AuthError(
      "Vui lòng nhập lý do hoặc ghi chú ít nhất 10 ký tự.",
      400,
      "REASON_REQUIRED",
    );
  return reason.trim();
}
