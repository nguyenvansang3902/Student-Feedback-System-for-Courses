import { z } from "zod";
import type { Role } from "../../generated/prisma/enums";

export const reportRoles = [
  "SINH_VIEN",
  "GIANG_VIEN",
  "TRUONG_BO_MON",
  "TRUONG_KHOA",
  "CAN_BO_DBCL",
  "LANH_DAO",
  "ADMIN",
  "PHONG_DAO_TAO",
  "PHONG_KHAO_THI",
  "THANH_TRA",
] as const;
export const reportFormats = ["csv", "xlsx", "pdf"] as const;
export type ReportFormat = (typeof reportFormats)[number];
export const reportsQuerySchema = z
  .object({
    role: z.enum(reportRoles).optional(),
    semesterId: z.uuid().optional(),
    campaignId: z.uuid().optional(),
    facultyId: z.uuid().optional(),
    departmentId: z.uuid().optional(),
    courseId: z.uuid().optional(),
  })
  .strict();
export type ReportsQuery = z.infer<typeof reportsQuerySchema>;
export const reportSettingsValueSchema = z
  .object({
    minFeedbackRecords: z.number().int().min(2).max(1000).default(5),
    minInspectionCases: z.number().int().min(2).max(1000).default(5),
    revision: z.number().int().positive().default(1),
  })
  .strict();
export const reportSettingsMutationSchema = reportSettingsValueSchema
  .extend({ requestId: z.uuid() })
  .strict();
export type ReportsSettings = z.infer<typeof reportSettingsValueSchema>;
export interface ReportColumn {
  key: string;
  label: string;
  format: "text" | "count" | "percent" | "days" | "score";
}
export interface ReportRow {
  key: string;
  label: string;
  cells: Record<string, string | number | null>;
  suppressed: boolean;
}
export interface ReportSection {
  key: string;
  title: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  message: string | null;
}
export interface ReportsDashboard {
  role: Role;
  generatedAt: string;
  scopeLabel?: string;
  filters: ReportsQuery & { role: Role };
  sections: ReportSection[];
  exportable: boolean;
}
export interface ReportsOptions {
  roles: Role[];
  defaultRole: Role;
  semesters: { id: string; name: string }[];
  campaigns: { id: string; title: string; semesterId: string }[];
  faculties: { id: string; name: string }[];
  departments: { id: string; name: string; facultyId: string }[];
  courses: { id: string; name: string; departmentId: string }[];
  capabilities: {
    export: boolean;
    settingsRead: boolean;
    settingsWrite: boolean;
  };
  exportFormats: ReportFormat[];
}
