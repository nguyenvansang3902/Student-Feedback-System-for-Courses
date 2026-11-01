import { z } from "zod";
import { pageInput } from "./access";

export const feedbackCategories = [
  "GIANG_DAY",
  "NOI_DUNG_DE_CUONG",
  "TAI_LIEU",
  "KIEM_TRA_DANH_GIA",
  "THI_KET_THUC_HOC_PHAN",
  "TO_CHUC_LOP_HOC",
  "KHIEU_NAI_NGHIEM_TRONG",
  "KHAC",
] as const;
export const feedbackSeverities = ["GOP_Y", "DE_XUAT", "KHIEU_NAI"] as const;
export const feedbackStatuses = [
  "MOI",
  "DA_TIEP_NHAN",
  "DANG_XU_LY",
  "DA_TRA_LOI",
  "DA_DONG",
  "TU_CHOI",
] as const;
export const inspectionViolations = [
  "VI_PHAM_QUY_CHE_GIANG_DAY",
  "GAY_AP_LUC_KHI_KHAO_SAT",
  "HANH_VI_KHONG_PHU_HOP",
  "VI_PHAM_QUY_CHE_THI_KIEM_TRA",
  "KHAC_NGHIEM_TRONG",
] as const;
export const feedbackIdentityLevels = [
  "AN_DANH_HOAN_TOAN",
  "CHO_THANH_TRA_BIET",
] as const;
export const feedbackActions = [
  "message",
  "accept",
  "start",
  "answer",
  "close",
  "reject",
  "forward",
] as const;
export type FeedbackCategory = (typeof feedbackCategories)[number];
export type FeedbackSeverity = (typeof feedbackSeverities)[number];
export type FeedbackStatus = (typeof feedbackStatuses)[number];
export type FeedbackIdentityLevel = (typeof feedbackIdentityLevels)[number];
export type InspectionViolation = (typeof inspectionViolations)[number];
export type FeedbackAction = (typeof feedbackActions)[number];

const text = z.string().trim().min(1).max(10000);
const reason = z.string().trim().min(10).max(1000);
const mutation = { revision: z.number().int().min(1), requestId: z.uuid() };
export const createFeedbackSchema = z
  .object({
    sectionId: z.uuid(),
    category: z.enum(feedbackCategories),
    severity: z.enum(feedbackSeverities),
    title: z.string().trim().min(5).max(200),
    body: z.string().trim().min(10).max(10000),
    isAnonymous: z.boolean().default(true),
    identityLevel: z.enum(feedbackIdentityLevels).optional(),
    violation: z.enum(inspectionViolations).optional(),
    acknowledgedSerious: z.boolean().optional(),
    requestId: z.uuid(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.category === "KHIEU_NAI_NGHIEM_TRONG") {
      if (!value.violation)
        context.addIssue({
          code: "custom",
          path: ["violation"],
          message: "Chọn loại vi phạm.",
        });
      if (value.acknowledgedSerious !== true)
        context.addIssue({
          code: "custom",
          path: ["acknowledgedSerious"],
          message: "Cần xác nhận đây là khiếu nại chính thức.",
        });
      if (value.severity !== "KHIEU_NAI")
        context.addIssue({
          code: "custom",
          path: ["severity"],
          message: "Khiếu nại nghiêm trọng có mức độ cố định.",
        });
    } else if (
      value.identityLevel !== undefined ||
      value.violation !== undefined ||
      value.acknowledgedSerious !== undefined
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Thông tin hồ sơ Thanh tra chỉ dùng cho khiếu nại nghiêm trọng.",
      });
    }
  });
export const feedbackListSchema = pageInput
  .extend({
    view: z.enum(["mine", "queue"]).default("mine"),
    status: z.enum(feedbackStatuses).optional(),
    category: z.enum(feedbackCategories).optional(),
  })
  .strict();
export const feedbackMessageSchema = z
  .object({ ...mutation, body: text })
  .strict();
export const feedbackTransitionSchema = z
  .object({
    ...mutation,
    action: z.enum(["accept", "start", "answer", "close", "reject", "forward"]),
    body: text.optional(),
    reason: reason.optional(),
    targetUserId: z.uuid().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (["reject", "forward"].includes(value.action) && !value.reason)
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Cần nhập lý do.",
      });
    if (value.action === "answer" && !value.body)
      context.addIssue({
        code: "custom",
        path: ["body"],
        message: "Cần nhập nội dung trả lời.",
      });
    if (value.action === "forward" && !value.targetUserId)
      context.addIssue({
        code: "custom",
        path: ["targetUserId"],
        message: "Chọn người nhận chuyển tiếp.",
      });
  });
export const inspectionListSchema = pageInput
  .extend({ status: z.literal("TIEP_NHAN").optional() })
  .strict();
export const inspectionAssignmentSchema = z
  .object({ ...mutation, assigneeId: z.uuid(), reason })
  .strict();
export type CreateFeedbackInput = z.input<typeof createFeedbackSchema>;
export type FeedbackListInput = z.input<typeof feedbackListSchema>;
export type FeedbackMessageInput = z.input<typeof feedbackMessageSchema>;
export type FeedbackTransitionInput = z.input<typeof feedbackTransitionSchema>;
export type InspectionAssignmentInput = z.input<
  typeof inspectionAssignmentSchema
>;

export interface FeedbackSection {
  id: string;
  code: string;
  courseName: string;
  semesterName: string;
  semesterLocked: boolean;
}
export interface FeedbackTarget {
  id: string;
  displayName: string;
  roleLabel: string;
}
export interface FeedbackAttachment {
  id: string;
  mimeType: string;
  byteSize: number;
  createdAt: string;
  displayName: string;
  downloadUrl: string;
}
export interface FeedbackListItem {
  id: string;
  category: FeedbackCategory;
  severity: FeedbackSeverity;
  title: string;
  status: FeedbackStatus;
  revision: number;
  isAnonymous: boolean;
  section: FeedbackSection;
  authorLabel: string;
  assignee: { id: string; displayName: string } | null;
  createdAt: string;
  inspectionId: string | null;
}
export interface FeedbackDetail extends FeedbackListItem {
  body: string;
  identityLevel: FeedbackIdentityLevel | null;
  author: { displayName: string; loginCode: string; email: string } | null;
  isAuthor: boolean;
  canAttach: boolean;
  allowedActions: FeedbackAction[];
  forwardTargets: FeedbackTarget[];
  examNotice: string | null;
  attachments: FeedbackAttachment[];
  messages: {
    id: string;
    body: string;
    authorLabel: string;
    isOwn: boolean;
    createdAt: string;
  }[];
  history: {
    id: string;
    event: string;
    fromStatus: FeedbackStatus;
    toStatus: FeedbackStatus;
    actorLabel: string;
    reason: string | null;
    occurredAt: string;
  }[];
}
export interface FeedbackList {
  items: FeedbackListItem[];
  total: number;
  page: number;
  pageSize: number;
}
export interface FeedbackOptions {
  sections: FeedbackSection[];
  categories: readonly FeedbackCategory[];
  severities: readonly FeedbackSeverity[];
  violations: readonly InspectionViolation[];
  identityLevels: readonly FeedbackIdentityLevel[];
  examNotice: string;
}
export interface InspectionCaseItem {
  id: string;
  source: string;
  violation: InspectionViolation | null;
  status: string;
  conclusion: string | null;
  revision: number;
  level: "summary" | "full";
  createdAt: string;
  feedbackId: string | null;
  title?: string;
  assignee?: { id: string; displayName: string } | null;
}
export interface InspectionCaseDetail extends InspectionCaseItem {
  feedback?: FeedbackDetail;
  canAssign: boolean;
  assignTargets: FeedbackTarget[];
  events?: {
    id: string;
    actorLabel: string;
    fromStatus: string | null;
    toStatus: string;
    reason: string | null;
    occurredAt: string;
  }[];
}
export interface InspectionCaseList {
  items: InspectionCaseItem[];
  total: number;
  page: number;
  pageSize: number;
}
