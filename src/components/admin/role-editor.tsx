"use client";
import { roleLabels } from "../auth/destination";
import { Field, inputStyle, secondaryStyle } from "./ui";
export type RoleGrant = {
  role: string;
  scopeType: string;
  facultyId?: string | null;
  departmentId?: string | null;
};
export type Scopes = {
  faculties: { id: string; code: string; name: string }[];
  departments: { id: string; code: string; name: string; facultyId: string }[];
};
export function cleanRoles(roles: RoleGrant[]) {
  return roles.map(({ role, scopeType, facultyId, departmentId }) => ({
    role,
    scopeType,
    ...(scopeType === "FACULTY"
      ? { facultyId }
      : scopeType === "DEPARTMENT"
        ? { departmentId }
        : {}),
  }));
}
export function RoleEditor({
  roles,
  change,
  scopes,
  disabled = false,
}: {
  roles: RoleGrant[];
  change: (roles: RoleGrant[]) => void;
  scopes?: Scopes;
  disabled?: boolean;
}) {
  function update(index: number, grant: RoleGrant) {
    change(roles.map((role, current) => (current === index ? grant : role)));
  }
  return (
    <fieldset disabled={disabled} className="space-y-4">
      <legend className="mb-3 text-sm font-bold text-slate-800">
        Vai trò và phạm vi
      </legend>
      {roles.map((grant, index) => (
        <div
          key={index}
          className="grid items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_auto]"
        >
          <Field id={`role-${index}`} label={`Vai trò ${index + 1}`}>
            <select
              id={`role-${index}`}
              value={grant.role}
              className={inputStyle}
              onChange={(event) => {
                const role = event.target.value;
                update(index, {
                  role,
                  scopeType:
                    role === "TRUONG_KHOA"
                      ? "FACULTY"
                      : role === "TRUONG_BO_MON"
                        ? "DEPARTMENT"
                        : "GLOBAL",
                });
              }}
            >
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          {grant.scopeType === "FACULTY" ? (
            <Field id={`scope-${index}`} label="Khoa phụ trách">
              <select
                id={`scope-${index}`}
                required
                className={inputStyle}
                value={grant.facultyId ?? ""}
                onChange={(event) =>
                  update(index, { ...grant, facultyId: event.target.value })
                }
              >
                <option value="">Chọn khoa</option>
                {scopes?.faculties.map((faculty) => (
                  <option key={faculty.id} value={faculty.id}>
                    {faculty.code} · {faculty.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : grant.scopeType === "DEPARTMENT" ? (
            <Field id={`scope-${index}`} label="Bộ môn phụ trách">
              <select
                id={`scope-${index}`}
                required
                className={inputStyle}
                value={grant.departmentId ?? ""}
                onChange={(event) =>
                  update(index, { ...grant, departmentId: event.target.value })
                }
              >
                <option value="">Chọn bộ môn</option>
                {scopes?.departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.code} · {department.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <p className="pt-9 text-sm text-slate-500">Phạm vi toàn hệ thống</p>
          )}
          <button
            type="button"
            className={`${secondaryStyle} sm:mt-7`}
            aria-label={`Bỏ vai trò ${index + 1}`}
            disabled={roles.length <= 1}
            onClick={() =>
              change(roles.filter((_, current) => current !== index))
            }
          >
            Bỏ
          </button>
        </div>
      ))}
      <button
        type="button"
        className={secondaryStyle}
        disabled={roles.length >= 20}
        onClick={() =>
          change([...roles, { role: "SINH_VIEN", scopeType: "GLOBAL" }])
        }
      >
        + Thêm vai trò / phạm vi
      </button>
      <p className="text-xs leading-6 text-slate-500">
        Trưởng khoa theo khoa; trưởng bộ môn theo bộ môn. Danh mục đơn vị hiện
        có được lấy từ hệ thống. Không thêm khoa hoặc bộ môn tại đây.
      </p>
    </fieldset>
  );
}
