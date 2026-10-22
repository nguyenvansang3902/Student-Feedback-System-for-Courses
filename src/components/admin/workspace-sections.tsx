"use client";
import { useState } from "react";
import { useAdminResource } from "./admin-client";
import { Notice, Pager } from "./ui";
type SectionDTO = {
  id: string;
  code: string;
  course: { code: string; name: string };
  semester: { code: string; name: string };
  department: { code: string; name: string };
  faculty: { code: string; name: string };
};
export function WorkspaceSections() {
  const [page, setPage] = useState(1);
  const resource = useAdminResource<{ items: SectionDTO[]; total: number }>(
    `/api/workspace/sections?page=${page}&pageSize=20`,
  );
  return (
    <section className="mt-7">
      <h2 className="text-lg font-bold text-slate-900">
        Lớp học phần trong phạm vi được cấp
      </h2>
      <p className="mt-3 text-sm leading-7 text-slate-500">
        Danh sách chỉ đọc theo tổng các vai trò và phạm vi của tài khoản. Đây
        chưa phải danh sách nhiệm vụ khảo sát hoặc kết quả môn học.
      </p>
      <Notice message={resource.error} error />
      {resource.loading && (
        <p role="status" className="py-7 text-sm text-slate-500">
          Đang tải lớp học phần…
        </p>
      )}
      {resource.data && (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {resource.data.items.map((section) => (
              <article
                key={section.id}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <p className="text-xs font-bold text-teal-800">
                  {section.code}
                </p>
                <h3 className="mt-2 text-base font-bold text-slate-900">
                  {section.course.code} · {section.course.name}
                </h3>
                <p className="mt-3 text-xs leading-6 text-slate-600">
                  {section.semester.name}
                  <br />
                  {section.department.name} · {section.faculty.name}
                </p>
              </article>
            ))}
          </div>
          {!resource.data.items.length && (
            <p className="mt-5 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
              Chưa có lớp học phần trong phạm vi của bạn.
            </p>
          )}
          <Pager page={page} total={resource.data.total} change={setPage} />
        </>
      )}
    </section>
  );
}
