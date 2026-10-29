import type {
  CampaignScope,
  CampaignStatus,
} from "../../generated/prisma/enums";

export const campaignActions = [
  "submit",
  "confirm",
  "return",
  "approve",
  "reject",
  "withdraw",
  "cancel",
  "extend",
  "close",
] as const;
export type CampaignAction = (typeof campaignActions)[number];
export interface CampaignInput {
  title: string;
  semesterId: string;
  templateId: string;
  scope: CampaignScope;
  facultyId?: string | null;
  departmentId?: string | null;
  sectionIds?: string[];
  startsAt: string;
  endsAt: string;
  minResponses?: number;
  minRate?: number;
  warningScore?: number;
  explanationDays?: number;
  mandatory?: boolean;
}
export interface CampaignUpdateInput extends CampaignInput {
  expectedRevision: number;
  requestId?: string;
}
export interface CampaignActionInput {
  expectedRevision: number;
  requestId: string;
  reason?: string;
  endsAt?: string;
}
export interface CampaignListInput {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: CampaignStatus;
  semesterId?: string;
}
export interface CampaignOptionInput {
  kind: "semesters" | "templates" | "faculties" | "departments" | "sections";
  page?: number;
  pageSize?: number;
  search?: string;
  semesterId?: string;
}
export interface CampaignOption {
  id: string;
  code?: string;
  name: string;
}
export type ReadinessCode =
  "RS-01" | "RS-02" | "RS-03" | "RS-04" | "RS-05" | "RS-06";
export interface CampaignReadinessIssue {
  code: ReadinessCode;
  severity: "BLOCKING" | "WARNING";
  sectionId: string | null;
  sectionCode: string | null;
  message: string;
  count: number;
}
export interface CampaignReadiness {
  campaignId: string;
  revision: number;
  checkedAt: string;
  snapshotHash: string;
  sectionCount: number;
  pairCount: number;
  canConfirm: boolean;
  blockers: CampaignReadinessIssue[];
  warnings: CampaignReadinessIssue[];
}
export interface CampaignConfirmation {
  id: string;
  status: "DA_XAC_NHAN" | "TRA_VE";
  occurredAt: string;
  campaignRevision: number;
  snapshotHash: string;
  sectionCount: number;
  pairCount: number;
  warnings: CampaignReadinessIssue[];
  reason: string | null;
  confirmedByName: string;
}
export interface CampaignHistoryItem {
  id: string;
  fromStatus: CampaignStatus;
  toStatus: CampaignStatus;
  action: string | null;
  reason: string | null;
  occurredAt: string;
  campaignRevision: number | null;
  actorName: string | null;
}
export interface CampaignSummary {
  id: string;
  title: string;
  revision: number;
  status: CampaignStatus;
  scope: CampaignScope;
  semesterId: string;
  semesterCode: string;
  semesterName: string;
  semesterLocked: boolean;
  templateId: string;
  templateName: string;
  templateVersion: number;
  facultyId: string | null;
  departmentId: string | null;
  facultyName: string | null;
  departmentName: string | null;
  startsAt: string;
  endsAt: string;
  minResponses: number;
  minRate: number;
  warningScore: number;
  explanationDays: number;
  mandatory: boolean;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  openedAt: string | null;
  openedSnapshotHash: string | null;
  dataDriftDetected: boolean;
  sectionCount: number;
}
export interface CampaignDetail extends CampaignSummary {
  sectionIds: string[];
  history: CampaignHistoryItem[];
  latestConfirmation: CampaignConfirmation | null;
  selectedSections?: { id: string; code: string; name: string }[];
}
export interface CampaignProgressItem {
  sectionId: string;
  sectionCode: string;
  courseName: string;
  total: number;
  done: number;
  pending: number;
  participationRate: number;
}
export interface CampaignProgress {
  campaignId: string;
  total: number;
  done: number;
  pending: number;
  participationRate: number;
  items: CampaignProgressItem[];
  totalSections: number;
  page: number;
  pageSize: number;
}
