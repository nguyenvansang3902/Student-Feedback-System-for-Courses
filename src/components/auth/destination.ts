export const roleLabels: Record<string, string> = {
  SINH_VIEN: "Sinh viên",
  GIANG_VIEN: "Giảng viên",
  TRUONG_BO_MON: "Trưởng bộ môn",
  TRUONG_KHOA: "Trưởng khoa",
  CAN_BO_DBCL: "Cán bộ đảm bảo chất lượng",
  LANH_DAO: "Lãnh đạo",
  ADMIN: "Quản trị viên",
};
export function authDestination(user: {
  purpose?: string;
  mustChangePassword?: boolean;
  roles?: readonly string[];
}): string {
  if (user.mustChangePassword || user.purpose === "PASSWORD_CHANGE")
    return "/doi-mat-khau";
  if (user.purpose === "MFA_SETUP") return "/bao-mat/thiet-lap";
  if (user.purpose === "MFA_VERIFY") return "/bao-mat/xac-thuc";
  return user.roles?.includes("ADMIN") ? "/quan-tri" : "/tai-khoan";
}
