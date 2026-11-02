import { z } from "zod";
import { pageInput } from "./access";
import { inspectionViolations } from "./feedback-types";
import type {
  InspectionCaseDetail,
  InspectionCaseItem,
} from "./feedback-types";

import {
  inspectionStatuses,
  inspectionConclusions,
  inspectionActions,
  ordinaryFeedbackCategories,
} from "../inspection-contract";
export {
  inspectionStatuses,
  inspectionConclusions,
  inspectionActions,
  ordinaryFeedbackCategories,
} from "../inspection-contract";
export type InspectionAction = (typeof inspectionActions)[number];
const mutation = { revision: z.number().int().min(1), requestId: z.uuid() };
const reason = z.string().trim().min(10).max(1000);
export const inspectionQueueSchema = pageInput
  .extend({ status: z.enum(inspectionStatuses).optional() })
  .strict();
export const inspectionTransitionSchema = z
  .object({
    ...mutation,
    action: z.enum(inspectionActions),
    reason: reason.optional(),
    conclusion: z.enum(inspectionConclusions).optional(),
    studentSummary: z.string().trim().min(10).max(5000).optional(),
    returnCategory: z.enum(ordinaryFeedbackCategories).optional(),
  })
  .strict()
  .superRefine((data, context) => {
    if (["conclude", "reject", "return"].includes(data.action) && !data.reason)
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Cần nhập lý do.",
      });
    if (data.action === "conclude" && !data.conclusion)
      context.addIssue({
        code: "custom",
        path: ["conclusion"],
        message: "Chọn kết luận hồ sơ.",
      });
    if (data.action === "notify" && !data.studentSummary)
      context.addIssue({
        code: "custom",
        path: ["studentSummary"],
        message: "Nhập tóm tắt kết quả gửi sinh viên.",
      });
    if (data.action === "return" && !data.returnCategory)
      context.addIssue({
        code: "custom",
        path: ["returnCategory"],
        message: "Chọn loại phản hồi thường để chuyển lại.",
      });
  });
export const inspectionNoteSchema = z
  .object({ ...mutation, body: z.string().trim().min(10).max(10000) })
  .strict();
export const inspectionTransferSchema = z
  .object({ ...mutation, reason, violation: z.enum(inspectionViolations) })
  .strict();
export interface InspectionInternalAttachment {
  id: string;
  displayName: string;
  mimeType: string;
  byteSize: number;
  downloadUrl: string;
}
export interface InspectionWorkflowDetail extends InspectionCaseDetail {
  conclusionReason?: string | null;
  acceptDueAt?: string;
  completeDueAt?: string;
  isOverdue: boolean;
  allowedActions: InspectionAction[];
  canNote: boolean;
  notes?: {
    id: string;
    body: string;
    authorLabel: string;
    createdAt: string;
    attachments: InspectionInternalAttachment[];
  }[];
}
export interface InspectionWorkflowItem extends InspectionCaseItem {
  isOverdue: boolean;
}
export interface InspectionWorkflowList {
  items: InspectionWorkflowItem[];
  total: number;
  page: number;
  pageSize: number;
}
export interface TransferredInspectionSummary {
  id: string;
  status: string;
  conclusion: string | null;
  source: "CHUYEN_PHAN_HOI";
}

export function inspectionTransitionTarget(
  status: string,
  action: string,
): (typeof inspectionStatuses)[number] | null {
  if (status === "TIEP_NHAN") {
    if (action === "accept") return "XAC_MINH";
    if (action === "reject") return "TU_CHOI";
    if (action === "return") return "CHUYEN_LAI";
  }
  if (status === "XAC_MINH" && action === "conclude") return "KET_LUAN";
  if (status === "KET_LUAN" && action === "notify") return "THONG_BAO";
  if (status === "THONG_BAO" && action === "close") return "DONG";
  return null;
}
