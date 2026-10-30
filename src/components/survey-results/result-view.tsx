import type {
  ResultBucket,
  ResultsCampaign,
} from "@/server/services/survey-results-types";
import { CampaignStatus } from "../campaigns/types";

export const numberText = (value: number | null) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("vi-VN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
export const rateText = (value: number | null) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("vi-VN", {
        style: "percent",
        maximumFractionDigits: 2,
      }).format(value);
export const levelNames = {
  CLASS: "Lớp học phần",
  COURSE: "Môn học",
  DEPARTMENT: "Bộ môn",
  FACULTY: "Khoa",
};
export function ResultCampaignHeading({
  campaign,
}: {
  campaign: ResultsCampaign;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="break-words text-3xl font-bold text-slate-950">
          {campaign.title}
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          {campaign.semesterName} · {campaign.templateName}
        </p>
        <p className="mt-1 text-xs leading-6 text-slate-500">
          Ngưỡng công bố: {campaign.minResponses} phiếu và{" "}
          {rateText(campaign.minRate)} tham gia
          {campaign.semesterLocked ? " · Học kỳ đã khóa sổ" : ""}
        </p>
      </div>
      <CampaignStatus status={campaign.status} />
    </div>
  );
}
export function ResultSummary({ result }: { result: ResultBucket }) {
  return (
    <>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-slate-500">Số phiếu</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {result.responseCount ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Nhiệm vụ khảo sát</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {result.taskCount ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Tỉ lệ tham gia</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {rateText(result.participationRate)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Điểm tổng hợp</dt>
          <dd className="mt-1 font-semibold text-teal-900">
            {result.available ? numberText(result.overallScore) : "—"}
          </dd>
        </div>
      </dl>
      {result.message && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          {result.message}
        </p>
      )}
      {result.available && result.rating && (
        <p className="mt-3 text-sm text-slate-600">
          Mức đánh giá: <strong>{result.rating}</strong>
        </p>
      )}
      {result.available && result.overallScore === null && (
        <p className="mt-3 text-sm text-slate-500">
          Chưa có câu trả lời tính điểm.
        </p>
      )}
    </>
  );
}
export function ResultGroups({ result }: { result: ResultBucket }) {
  if (!result.available) return null;
  return (
    <div className="mt-6 space-y-5">
      {result.groups.map((group) => (
        <section
          key={group.groupId}
          className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
        >
          <div className="flex flex-wrap justify-between gap-3">
            <h3 className="min-w-0 break-words font-bold text-slate-900">
              {group.title}
            </h3>
            <p className="text-sm text-slate-600">
              Điểm nhóm: <strong>{numberText(group.score)}</strong>
            </p>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Trọng số nhóm: {group.weight}
          </p>
          <div className="mt-4 space-y-5">
            {group.questions.map((question) => (
              <div
                key={question.questionId}
                className="border-t border-slate-100 pt-4"
              >
                <h4 className="break-words text-sm font-semibold leading-6 text-slate-800">
                  {question.label}
                </h4>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  {question.validCount} hợp lệ · {question.naCount} không áp
                  dụng · {question.blankCount} bỏ trống
                  {question.type === "LIKERT"
                    ? ` · Thang ${question.scaleMin}–${question.scaleMax} · Trọng số ${question.weight}`
                    : ""}
                </p>
                {question.type === "LIKERT" && (
                  <p className="mt-2 text-sm text-slate-700">
                    Trung bình: <strong>{numberText(question.mean)}</strong>
                  </p>
                )}
                {question.distribution.length > 0 && (
                  <dl className="mt-3 flex flex-wrap gap-2">
                    {question.distribution.map((entry) => (
                      <div
                        key={entry.value}
                        className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"
                      >
                        <dt className="break-words">{entry.label}</dt>
                        <dd className="mt-1 font-semibold text-slate-800">
                          {entry.count} lượt
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
