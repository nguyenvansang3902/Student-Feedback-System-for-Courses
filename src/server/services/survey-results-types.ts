import type { CampaignStatus } from "../../generated/prisma/enums";
import type { SurveyGroupScore } from "./survey-score";

export interface ResultsCapabilities {
  standard: boolean;
  assessment: boolean;
  aggregate: boolean;
  publish: boolean;
  moderate: boolean;
  incomplete: boolean;
  remind: boolean;
}
export interface ResultsCampaign {
  id: string;
  title: string;
  status: CampaignStatus;
  revision: number;
  semesterId: string;
  semesterName: string;
  templateId: string;
  templateName: string;
  semesterLocked: boolean;
  minResponses: number;
  minRate: number;
  capabilities: ResultsCapabilities;
}
export interface ResultsPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export type ResultLevel = "CLASS" | "COURSE" | "DEPARTMENT" | "FACULTY";
export interface ResultBucket {
  id: string;
  level: ResultLevel;
  code: string;
  name: string;
  available: boolean;
  message: string | null;
  responseCount: number | null;
  taskCount: number | null;
  participationRate: number | null;
  overallScore: number | null;
  rating: string | null;
  groups: SurveyGroupScore[];
}
export interface ResultsDetail {
  campaign: ResultsCampaign;
  audience: "STANDARD" | "ASSESSMENT";
  buckets: ResultBucket[];
  pendingModeration: number | null;
}
export interface ResultComparison {
  label: string;
  result: ResultBucket | null;
  message: string | null;
}
export interface ResultsClassDetail {
  campaign: ResultsCampaign;
  result: ResultBucket;
  comments: { questionLabel: string; text: string }[];
  comparisons: ResultComparison[];
}
export interface ResultsMutationInput {
  expectedRevision: number;
  requestId: string;
}
export interface ResultsMutationResult {
  campaignId: string;
  status: CampaignStatus;
  revision: number;
  resultCount: number;
  replayed: boolean;
}
export interface ModerationItem {
  id: string;
  questionLabel: string;
  text: string;
  status: "CHO_KIEM_DUYET" | "HIEN_THI" | "DA_AN";
  reason: string | null;
  flagged: boolean;
}
export interface ModerationInput {
  status: "HIEN_THI" | "DA_AN";
  reason: string;
}
export interface IncompleteItem {
  studentId: string;
  loginCode: string;
  displayName: string;
  sectionId: string;
  sectionCode: string;
}
export interface ReminderResult {
  campaignId: string;
  day: string;
  queued: number;
}
export interface ResultsListInput {
  page?: number;
  pageSize?: number;
  search?: string;
}
