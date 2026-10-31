"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { roleLabels } from "../auth/destination";
import { adminRequest, useAdminResource } from "./admin-client";
import {
  cleanRoles,
  RoleEditor,
  type RoleGrant,
  type Scopes,
} from "./role-editor";
import {
  buttonStyle,
  Field,
  inputStyle,
  Notice,
  Pager,
  secondaryStyle,
} from "./ui";
export type UserDTO = {
  id: string;
  loginCode: string;
  email: string;
  displayName: string;
  status: string;
  mustChangePassword: boolean;
  roles: RoleGrant[];
};
const statusLabels: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  DISABLED: "Đã khóa",
  PENDING_ACTIVATION: "Chờ kích hoạt",
};
export function UserList() {
  const [filter, setFilter] = useState({ search: "", status: "" });
  const [page, setPage] = useState(1);
  const query = new URLSearchParams({
    ...(filter.search ? { search: filter.search } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    page: String(page),
    pageSize: "20",
  });
  const resource = useAdminResource<{ items: UserDTO[]; total: number }>(
    `/api/admin/users?${query}`,
  );
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setFilter({
      search: String(data.get("search") ?? "").trim(),
      status: String(data.get("status") ?? ""),
    });
    setPage(1);
  }
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">
            Quản lý người dùng
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Tạo tài khoản, quản lý trạng thái, vai trò và phạm vi.
          </p>
        </div>
        <Link href="/quan-tri/nguoi-dung/tao" className={buttonStyle}>
          + Tạo tài khoản
        </Link>
      </div>
      <form
        onSubmit={search}
        className="mt-7 grid items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
      >
        <div className="min-w-0 flex-1">
          <Field label="Tìm mã, email hoặc họ tên" id="user-search">
            <input
              id="user-search"
              name="search"
              maxLength={100}
              className={inputStyle}
            />
          </Field>
        </div>
        <Field label="Trạng thái" id="user-status">
          <select id="user-status" name="status" className={inputStyle}>
            <option value="">Tất cả</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <button className={secondaryStyle}>Tìm kiếm</button>
      </form>
      <Notice message={resource.error} error />
      {resource.loading && (
        <p role="status" className="py-8 text-sm text-slate-500">
          Đang tải danh sách…
        </p>
      )}
      {resource.data && (
        <>
          <ul className="mt-6 space-y-3 sm:hidden">
            {resource.data.items.map((user) => (
              <li
                key={user.id}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <p className="font-semibold text-slate-900">
                  {user.displayName}
                </p>
                <p className="mt-2 break-all text-xs leading-6 text-slate-500">
                  {user.loginCode}
                  <br />
                  {user.email}
                </p>
                <p className="mt-3 text-xs leading-6 text-slate-600">
                  {[
                    ...new Set(
                      user.roles.map(
                        (grant) => roleLabels[grant.role] ?? grant.role,
                      ),
                    ),
                  ].join(", ")}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                    {statusLabels[user.status] ?? user.status}
                  </span>
                  <Link
                    className="text-sm font-semibold text-teal-800 underline"
                    href={`/quan-tri/nguoi-dung/${user.id}`}
                  >
                    Xem / cập nhật
                    <span className="sr-only"> {user.displayName}</span>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white sm:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="p-4">Người dùng</th>
                  <th className="p-4">Vai trò</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {resource.data.items.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100">
                    <td className="p-4">
                      <p className="font-semibold text-slate-900">
                        {user.displayName}
                      </p>
                      <p className="mt-1 break-all text-xs text-slate-500">
                        {user.loginCode} · {user.email}
                      </p>
                    </td>
                    <td className="p-4 text-xs leading-6">
                      {[
                        ...new Set(
                          user.roles.map(
                            (grant) => roleLabels[grant.role] ?? grant.role,
                          ),
                        ),
                      ].join(", ")}
                    </td>
                    <td className="p-4 text-xs">
                      {statusLabels[user.status] ?? user.status}
                    </td>
                    <td className="p-4">
                      <Link
                        className="font-semibold text-teal-800 underline"
                        href={`/quan-tri/nguoi-dung/${user.id}`}
                      >
                        Xem / cập nhật
                        <span className="sr-only"> {user.displayName}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {resource.data.items.length === 0 && (
              <p className="p-6 text-sm text-slate-500">
                Không có người dùng phù hợp.
              </p>
            )}
          </div>
          <Pager page={page} total={resource.data.total} change={setPage} />
        </>
      )}
    </div>
  );
}

export function UserEditor({
  userId,
  currentUserId,
}: {
  userId?: string;
  currentUserId: string;
}) {
  const [notice, setNotice] = useState("");
  const scopes = useAdminResource<Scopes>("/api/admin/scopes");
  const resource = useAdminResource<{ user: UserDTO }>(
    userId ? `/api/admin/users/${userId}` : "/api/admin/scopes",
  );
  return (
    <div>
      <Link
        href="/quan-tri/nguoi-dung"
        className="text-sm font-semibold text-teal-800"
      >
        ← Danh sách người dùng
      </Link>
      <h1 className="mt-5 text-3xl font-bold text-slate-950">
        {userId ? "Chi tiết người dùng" : "Tạo tài khoản"}
      </h1>
      <Notice message={resource.error ?? scopes.error} error />
      <Notice message={notice} />
      {resource.loading || scopes.loading ? (
        <p role="status" className="py-7 text-sm text-slate-500">
          Đang tải thông tin…
        </p>
      ) : (
        !resource.error &&
        !scopes.error && (
          <UserEditorForm
            key={userId ?? "new"}
            user={userId ? resource.data?.user : undefined}
            scopes={scopes.data}
            currentUserId={currentUserId}
            reload={resource.reload}
            notify={setNotice}
          />
        )
      )}
    </div>
  );
}

function UserEditorForm({
  user,
  scopes,
  currentUserId,
  reload,
  notify,
}: {
  user?: UserDTO;
  scopes?: Scopes;
  currentUserId: string;
  reload: () => void;
  notify: (message: string) => void;
}) {
  const [roles, setRoles] = useState<RoleGrant[]>(
    user?.roles ?? [{ role: "SINH_VIEN", scopeType: "GLOBAL" }],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function mutate(
    path: string,
    body: Record<string, unknown>,
    success: string,
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    notify("");
    try {
      const result = await adminRequest<{ user?: UserDTO }>(path, body);
      notify(success);
      if (!user && result.user)
        window.location.replace(`/quan-tri/nguoi-dung/${result.user.id}`);
      else reload();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Chưa cập nhật được.",
      );
    } finally {
      setBusy(false);
    }
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = {
      roles: cleanRoles(roles),
      stepUpCode: String(data.get("stepUpCode") ?? ""),
    };
    if (user)
      void mutate(
        `/api/admin/users/${user.id}/roles`,
        body,
        "Đã cập nhật vai trò. Các phiên của người dùng đã được thu hồi.",
      );
    else
      void mutate(
        "/api/admin/users",
        {
          ...body,
          loginCode: String(data.get("loginCode") ?? "").trim(),
          email: String(data.get("email") ?? "").trim(),
          displayName: String(data.get("displayName") ?? "").trim(),
        },
        "Đã tạo tài khoản chờ kích hoạt.",
      );
    const input = form.elements.namedItem("stepUpCode") as HTMLInputElement;
    input.value = "";
  }
  return (
    <div className="mt-7 space-y-6">
      <Notice message={error} error />
      <form
        onSubmit={save}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"
        aria-busy={busy}
      >
        {user ? (
          <dl className="grid gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">Họ tên</dt>
              <dd className="mt-1 font-semibold">{user.displayName}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Mã và email</dt>
              <dd className="mt-1 break-all">
                {user.loginCode} · {user.email}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Trạng thái</dt>
              <dd className="mt-1">
                {statusLabels[user.status] ?? user.status}
              </dd>
            </div>
          </dl>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="loginCode" label="Tài khoản">
              <input
                id="loginCode"
                name="loginCode"
                required
                maxLength={32}
                disabled={busy}
                className={inputStyle}
              />
            </Field>
            <Field id="email" label="Email">
              <input
                id="email"
                name="email"
                type="email"
                required
                maxLength={254}
                disabled={busy}
                className={inputStyle}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field id="displayName" label="Họ và tên">
                <input
                  id="displayName"
                  name="displayName"
                  required
                  maxLength={160}
                  disabled={busy}
                  className={inputStyle}
                />
              </Field>
            </div>
            <p className="text-xs leading-6 text-slate-500 sm:col-span-2">
              Tài khoản mới ở trạng thái chờ kích hoạt. Người dùng yêu cầu liên
              kết ở trang Kích hoạt tài khoản để tự tạo mật khẩu.
            </p>
          </div>
        )}
        <RoleEditor
          roles={roles}
          change={setRoles}
          scopes={scopes}
          disabled={busy || user?.id === currentUserId}
        />
        <Field
          id="stepUpCode"
          label="Mã TOTP hiện tại"
          hint="Thay đổi vai trò yêu cầu xác thực lại. Nếu mã vừa được dùng, đợi mã mới."
        >
          <input
            id="stepUpCode"
            name="stepUpCode"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            disabled={busy || user?.id === currentUserId}
            className={inputStyle}
          />
        </Field>
        {user?.id === currentUserId && (
          <p className="text-sm leading-7 text-slate-500">
            Cần quản trị viên khác cập nhật vai trò hoặc phạm vi của tài khoản
            đang đăng nhập.
          </p>
        )}
        <button
          disabled={busy || user?.id === currentUserId}
          className={buttonStyle}
        >
          {busy
            ? "Đang lưu…"
            : user
              ? "Lưu vai trò và phạm vi"
              : "Tạo tài khoản"}
        </button>
      </form>
      {user && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="text-lg font-bold text-slate-900">
            Trạng thái tài khoản
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Khóa tài khoản sẽ thu hồi mọi phiên. Mở khóa một tài khoản chưa có
            mật khẩu sẽ đưa tài khoản trở lại trạng thái chờ kích hoạt.
          </p>
          {user.id !== currentUserId && (
            <button
              disabled={busy}
              className={`${secondaryStyle} mt-4`}
              onClick={() => {
                if (
                  window.confirm(
                    user.status === "DISABLED"
                      ? "Mở lại tài khoản này?"
                      : "Khóa tài khoản và kết thúc mọi phiên của người dùng này?",
                  )
                )
                  void mutate(
                    `/api/admin/users/${user.id}/status`,
                    {
                      status:
                        user.status === "DISABLED" ? "ACTIVE" : "DISABLED",
                    },
                    "Đã cập nhật trạng thái tài khoản.",
                  );
              }}
            >
              {user.status === "DISABLED"
                ? "Mở khóa tài khoản"
                : "Khóa tài khoản"}
            </button>
          )}
        </section>
      )}
      {user &&
        user.id !== currentUserId &&
        user.roles.some((grant) => grant.role === "ADMIN") && (
          <form
            className="space-y-5 rounded-2xl border border-amber-200 bg-amber-50/40 p-5 sm:p-7"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              if (
                !window.confirm(
                  "Đặt lại xác thực hai bước và thu hồi các phiên của người dùng này?",
                )
              )
                return;
              void mutate(
                `/api/admin/users/${user.id}/reset-mfa`,
                {
                  reason: String(data.get("reason") ?? "").trim(),
                  stepUpCode: String(data.get("resetStepUpCode") ?? ""),
                },
                "Đã đặt lại xác thực hai bước. Người dùng cần đăng nhập và thiết lập lại.",
              );
              form.reset();
            }}
          >
            <h2 className="text-lg font-bold text-slate-900">
              Đặt lại xác thực hai bước
            </h2>
            <p className="text-sm leading-7 text-slate-600">
              Chỉ thực hiện khi đã xác minh yêu cầu của người dùng. Mã và khóa
              cũ bị vô hiệu, thao tác được ghi nhật ký.
            </p>
            <Field id="reason" label="Lý do">
              <textarea
                id="reason"
                name="reason"
                required
                minLength={5}
                maxLength={500}
                disabled={busy}
                className={inputStyle}
              />
            </Field>
            <Field id="resetStepUpCode" label="Mã TOTP hiện tại">
              <input
                id="resetStepUpCode"
                name="resetStepUpCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                disabled={busy}
                className={inputStyle}
              />
            </Field>
            <button disabled={busy} className={secondaryStyle}>
              Đặt lại xác thực hai bước
            </button>
          </form>
        )}
    </div>
  );
}
