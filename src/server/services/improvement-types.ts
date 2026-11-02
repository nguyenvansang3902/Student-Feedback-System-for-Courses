import { z } from "zod";
import { pageInput } from "./access";

export const improvementStatuses = [
  "CAN_GIAI_TRINH",
  "DA_GUI",
  "CAN_BO_SUNG",
  "DA_XAC_NHAN",
] as const;
export const improvementListSchema = pageInput
  .extend({ status: z.enum(improvementStatuses).optional() })
  .strict();
const mutation = { revision: z.number().int().min(1), requestId: z.uuid() };
export const improvementMutationSchema = z.discriminatedUnion("action", [
  z
    .object({
      ...mutation,
      action: z.literal("submit"),
      explanation: z.string().trim().min(20).max(10000),
      actionPlan: z.string().trim().min(20).max(10000),
    })
    .strict(),
  z
    .object({
      ...mutation,
      action: z.enum(["confirm", "supplement"]),
      comment: z.string().trim().min(10).max(2000),
    })
    .strict(),
]);
export interface ImprovementItem {
  id: string;
  campaignId: string;
  campaignTitle: string;
  sectionCode: string;
  courseName: string;
  teacherName: string;
  status: (typeof improvementStatuses)[number];
  revision: number;
  dueAt: string;
  isOverdue: boolean;
}
export interface ImprovementDetail extends ImprovementItem {
  explanation: string | null;
  actionPlan: string | null;
  reviewComment: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  semesterLocked: boolean;
  canSubmit: boolean;
  canReview: boolean;
  history: {
    id: string;
    fromStatus: string;
    toStatus: string;
    note: string | null;
    actorLabel: string;
    occurredAt: string;
  }[];
}
export interface ImprovementList {
  items: ImprovementItem[];
  total: number;
  page: number;
  pageSize: number;
}
export const recommendationStatuses = ["DA_GUI", "DA_PHAN_HOI"] as const;
export const recommendationListSchema = pageInput
  .extend({ status: z.enum(recommendationStatuses).optional() })
  .strict();
export const recommendationCreateSchema = z
  .object({
    campaignId: z.uuid(),
    courseId: z.uuid(),
    recipientId: z.uuid(),
    body: z.string().trim().min(20).max(10000),
    requestId: z.uuid(),
  })
  .strict();
export const recommendationRespondSchema = z
  .object({
    ...mutation,
    outcome: z.enum(["DA_TIEP_THU", "KHONG_TIEP_THU"]),
    reason: z.string().trim().min(10).max(5000),
  })
  .strict();
export interface RecommendationItem {
  id: string;
  campaignId: string;
  campaignTitle: string;
  courseName: string;
  departmentName: string;
  recipientName: string;
  status: (typeof recommendationStatuses)[number];
  revision: number;
  dueAt: string;
  isOverdue: boolean;
}
export interface RecommendationDetail extends RecommendationItem {
  body: string;
  outcome: string | null;
  responseReason: string | null;
  respondedAt: string | null;
  semesterLocked: boolean;
  canRespond: boolean;
}
export interface RecommendationList {
  items: RecommendationItem[];
  total: number;
  page: number;
  pageSize: number;
}
export interface RecommendationOptions {
  campaigns: {
    id: string;
    title: string;
    courses: {
      id: string;
      name: string;
      recipients: { id: string; displayName: string }[];
    }[];
  }[];
}
