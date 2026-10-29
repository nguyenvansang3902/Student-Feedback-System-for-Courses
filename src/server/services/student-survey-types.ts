import type { CampaignStatus, QuestionType } from "../../generated/prisma/enums";

export type StudentSurveyStatus = "PENDING" | "DONE";
export type StudentSurveyAvailability =
  | "AVAILABLE"
  | "COMPLETED"
  | "NOT_OPEN"
  | "CLOSED"
  | "SEMESTER_LOCKED";

export interface StudentSurveyItem {
  id: string;
  campaignId: string;
  campaignTitle: string;
  sectionId: string;
  sectionCode: string;
  courseName: string;
  semesterName: string;
  status: StudentSurveyStatus;
  doneDate: string | null;
  startsAt: string;
  endsAt: string;
  campaignStatus: CampaignStatus;
  semesterLocked: boolean;
  canSubmit: boolean;
  availability: StudentSurveyAvailability;
}

export interface StudentSurveyOption {
  id: string;
  label: string;
  position: number;
}
export interface StudentSurveyQuestion {
  id: string;
  label: string;
  type: QuestionType;
  position: number;
  required: boolean;
  allowNA: boolean;
  scaleMin: number | null;
  scaleMax: number | null;
  options: StudentSurveyOption[];
}
export interface StudentSurveyTemplate {
  id: string;
  familyId: string;
  version: number;
  name: string;
  groups: {
    id: string;
    title: string;
    position: number;
    questions: StudentSurveyQuestion[];
  }[];
}
export interface StudentSurveyDetail extends StudentSurveyItem {
  template: StudentSurveyTemplate | null;
}
export interface StudentSurveyListInput {
  page?: number;
  pageSize?: number;
  status?: StudentSurveyStatus;
}
export interface StudentSurveyList {
  items: StudentSurveyItem[];
  total: number;
  page: number;
  pageSize: number;
}
export interface StudentSurveySubmitResult {
  status: "DONE";
  doneDate: string;
}
export interface StudentSurveyAnswerInput {
  questionId: string;
  isNotApplicable?: boolean;
  valueNumber?: number | null;
  valueText?: string | null;
  valueOptionIds?: string[] | null;
  valueBoolean?: boolean | null;
}
export interface StudentSurveySubmitInput {
  answers: StudentSurveyAnswerInput[];
}
