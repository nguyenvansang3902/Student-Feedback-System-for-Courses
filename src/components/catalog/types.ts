export type CatalogEntity =
  | "semesters"
  | "faculties"
  | "departments"
  | "courses"
  | "sections"
  | "teaching";
export type CatalogRecord = {
  id: string;
  code: string;
  name: string;
  startsOn?: string;
  endsOn?: string;
  lockedAt?: string | null;
  isActive?: boolean;
  credits?: number;
  isLead?: boolean;
  facultyId?: string;
  facultyCode?: string;
  facultyName?: string;
  departmentId?: string;
  departmentCode?: string;
  departmentName?: string;
  courseId?: string;
  courseCode?: string;
  courseName?: string;
  semesterId?: string;
  semesterCode?: string;
  semesterName?: string;
  sectionId?: string;
  sectionCode?: string;
  teacherId?: string;
  teacherName?: string;
  teacherCode?: string;
};
export type CatalogList = {
  items: CatalogRecord[];
  total: number;
  page: number;
  pageSize: number;
};
export const catalogLabels: Record<CatalogEntity, string> = {
  semesters: "Học kỳ",
  faculties: "Khoa",
  departments: "Bộ môn",
  courses: "Môn học",
  sections: "Lớp học phần",
  teaching: "Phân công giảng viên",
};
export const catalogPaths: Record<CatalogEntity, string> = {
  semesters: "hoc-ky",
  faculties: "khoa",
  departments: "bo-mon",
  courses: "mon-hoc",
  sections: "lop-hoc-phan",
  teaching: "phan-cong",
};
