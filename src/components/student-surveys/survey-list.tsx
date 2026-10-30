"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { StudentSurveyList as SurveyListData } from "@/server/services/student-survey-types";
import {
  buttonStyle,
  inputStyle,
  Notice,
  Pager,
  secondaryStyle,
  vietnamTime,
} from "../admin/ui";
import { useSurveyResource } from "./survey-client";
import { clearTaskSurveyDrafts } from "./survey-draft";
import { SurveyStatus, surveyDate } from "./survey-status";

export function StudentSurveyList({ userId }: { userId: string }) {
  const [page, setPage] = useState(1),
    [status, setStatus] = useState("");
  const query = new URLSearchParams({
    page: String(page),
    pageSize: "20",
    ...(status ? { status } : {}),
  });
  const resource = useSurveyResource<SurveyListData>(
    `/api/student-surveys?${query}`,
  );
  useEffect(() => {
    for (const item of resource.data?.items ?? [])
      if (
        item.status === "DONE" ||
        item.availability === "CLOSED" ||
        item.availability === "SEMESTER_LOCKED"
      )
        clearTaskSurveyDrafts({ userId, taskId: item.id });
  }, [resource.data, userId]);
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(String(new FormData(event.currentTarget).get("status") ?? ""));
    setPage(1);
  }
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">
        Khảo sát của tôi
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
        Các khảo sát dành cho lớp học phần của sinh viên. Mỗi khảo sát chỉ được
        nộp một lần.
      </p>
      <form
        onSubmit={filter}
        className="mt-7 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <div className="min-w-0 flex-1 basis-52">
          <label
            htmlFor="survey-status"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Trạng thái nhiệm vụ
          </label>
          <select name="status" id="survey-status" className={inputStyle}>
            <option value="">Tất cả nhiệm vụ</option>
            <option value="PENDING">Chưa hoàn thành</option>
            <option value="DONE">Đã hoàn thành</option>
          </select>
        </div>
        <button type="submit" className={secondaryStyle}>
          Lọc danh sách
        </button>
      </form>
      <Notice message={resource.error} error />
      {resource.error && (
        <button
          type="button"
          className={secondaryStyle}
          onClick={resource.reload}
        >
          Tải lại danh sách
        </button>
      )}
      {resource.loading && (
        <p role="status" className="py-10 text-sm text-slate-500">
          Đang tải khảo sát của sinh viên…
        </p>
      )}
      {resource.data && (
        <>
          <div className="mt-5 grid gap-4">
            {resource.data.items.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs leading-6 text-slate-500">
                      {item.semesterName} · {item.sectionCode}
                    </p>
                    <h2 className="mt-2 break-words text-lg font-bold text-slate-950">
                      {item.courseName}
                    </h2>
                    <p className="mt-1 break-words text-sm text-slate-600">
                      {item.campaignTitle}
                    </p>
                  </div>
                  <SurveyStatus availability={item.availability} />
                </div>
                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-slate-500">
                      Bắt đầu · giờ Việt Nam
                    </dt>
                    <dd className="mt-1.5 font-medium text-slate-700">
                      {vietnamTime(item.startsAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">
                      Kết thúc theo lịch · giờ Việt Nam
                    </dt>
                    <dd className="mt-1.5 font-medium text-slate-700">
                      {vietnamTime(item.endsAt)}
                    </dd>
                  </div>
                </dl>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <p className="text-xs leading-6 text-slate-500">
                    {item.status === "DONE"
                      ? `Ngày hoàn thành: ${surveyDate(item.doneDate)}`
                      : item.canSubmit
                        ? "Sinh viên có thể làm và lưu nháp trên thiết bị này."
                        : "Hiện chưa thể nộp phiếu cho nhiệm vụ này."}
                  </p>
                  <Link
                    href={`/khao-sat/${item.id}${item.status === "DONE" ? "/da-nop" : ""}`}
                    className={item.canSubmit ? buttonStyle : secondaryStyle}
                  >
                    {item.status === "DONE"
                      ? "Xem xác nhận"
                      : item.canSubmit
                        ? "Làm khảo sát →"
                        : "Xem lịch khảo sát"}
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {!resource.data.items.length && (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <h2 className="font-bold text-slate-800">
                Chưa có khảo sát phù hợp
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                Sinh viên có thể đổi bộ lọc hoặc quay lại khi lớp học phần được
                mở khảo sát.
              </p>
            </div>
          )}
          <Pager page={page} total={resource.data.total} change={setPage} />
        </>
      )}
    </>
  );
}
