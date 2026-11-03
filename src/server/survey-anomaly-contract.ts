export const anomalyDecisions = [
  "BINH_THUONG",
  "CAN_LUU_Y",
  "CHUYEN_XAC_MINH",
] as const;
export const anomalyStatuses = ["CHO_XEM_XET", ...anomalyDecisions] as const;
export const anomalyRuleLabels: Record<string, string> = {
  UNIFORM_LIKERT: "Phiếu thang điểm đồng nhất",
  PREVIOUS_SEMESTER_SHIFT: "Chênh lệch so với học kỳ trước",
};
export const anomalyStatusLabels: Record<string, string> = {
  CHO_XEM_XET: "Chờ xem xét",
  BINH_THUONG: "Bình thường",
  CAN_LUU_Y: "Cần lưu ý",
  CHUYEN_XAC_MINH: "Chuyển xác minh",
};
export interface AnomalySettings {
  minResponses: number;
  uniformRate: number;
  scoreDelta: number;
  revision: number;
}
export interface AnomalyMetrics {
  version: 1;
  responseCount: number;
  participationRate: number;
  uniformCount: number;
  uniformRate: number | null;
  scoreDeltaAbs: number | null;
  priorSemesterName: string | null;
  thresholds: { minResponses: number; uniformRate: number; scoreDelta: number };
}
export interface SurveyAnomalyItem {
  id: string;
  revision: number;
  campaignId: string;
  campaignTitle: string;
  sectionCode: string;
  courseName: string;
  semesterName: string;
  ruleCode: string;
  status: string;
  createdAt: string;
  metrics: AnomalyMetrics;
  caseId: string | null;
  canReview: boolean;
}
export interface SurveyAnomalyDetail extends SurveyAnomalyItem {
  note: string | null;
  events: {
    id: string;
    decision: string;
    note: string;
    actorLabel: string;
    occurredAt: string;
  }[];
}
