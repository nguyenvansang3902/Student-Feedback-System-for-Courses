"use client";
import Link from "next/link";
import { useEffect } from "react";
import type { StudentSurveyDetail } from "@/server/services/student-survey-types";
import { buttonStyle } from "../admin/ui";
import { clearTaskSurveyDrafts } from "./survey-draft";
import { surveyDate } from "./survey-status";
export function StudentSurveyConfirmation({
  item,
  userId,
}: {
  item: StudentSurveyDetail;
  userId: string;
}) {
  useEffect(() => {
    clearTaskSurveyDrafts({ userId, taskId: item.id });
  }, [userId, item.id]);
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-teal-200 bg-white p-6 sm:p-9">
      <div
        aria-hidden="true"
        className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-2xl font-bold text-teal-800"
      >
        ✓
      </div>
      <p className="text-sm font-semibold text-teal-800">
        Đã hoàn thành nhiệm vụ
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        Cảm ơn bạn đã gửi khảo sát
      </h1>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        Hệ thống đã ghi nhận trạng thái hoàn thành. Phiếu đã nộp chỉ một lần và
        không thể sửa hoặc xóa.
      </p>
      <dl className="mt-6 space-y-4 rounded-xl bg-slate-50 p-5 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Môn học · lớp học phần</dt>
          <dd className="mt-1 font-semibold break-words text-slate-900">
            {item.courseName} · {item.sectionCode}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Đợt khảo sát</dt>
          <dd className="mt-1 break-words text-slate-700">
            {item.campaignTitle}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Ngày hoàn thành</dt>
          <dd className="mt-1 text-slate-700">{surveyDate(item.doneDate)}</dd>
        </div>
      </dl>
      <p className="mt-5 text-sm leading-7 text-slate-600">
        Trang xác nhận chỉ hiển thị trạng thái nhiệm vụ. Nội dung phiếu được lưu
        riêng, không có liên kết tới tài khoản của bạn trong dữ liệu ứng dụng.
      </p>
      <Link href="/khao-sat" className={`mt-7 inline-flex ${buttonStyle}`}>
        Về khảo sát của tôi →
      </Link>
    </section>
  );
}
