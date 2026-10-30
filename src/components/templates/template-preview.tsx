"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { buttonStyle, inputStyle, Notice, secondaryStyle } from "../admin/ui";
import { questionLabels, type TemplateDetail } from "./types";

type PreviewAnswer = { na?: boolean; values?: string[]; text?: string };

export function TemplatePreview({ template }: { template: TemplateDetail }) {
  const [answers, setAnswers] = useState<Record<string, PreviewAnswer>>({});
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  function update(id: string, patch: PreviewAnswer) {
    setAnswers((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
    setMessage(undefined);
    setError(undefined);
  }
  function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const missing = template.groups
      .flatMap((group) => group.questions)
      .filter((question) => {
        const answer = answers[question.id];
        return (
          question.required &&
          !(question.allowNA && answer?.na) &&
          !(question.type === "TEXT"
            ? answer?.text?.trim()
            : answer?.values?.length)
        );
      });
    if (missing.length) {
      setError(
        `Còn ${missing.length} câu bắt buộc chưa được trả lời. Hãy điền hoặc chọn Không áp dụng nếu câu cho phép.`,
      );
      setMessage(undefined);
      document.getElementById(`preview-question-${missing[0].id}`)?.focus();
      return;
    }
    setError(undefined);
    setMessage("Bản xem trước hợp lệ. Chưa có phản hồi nào được gửi hoặc lưu.");
  }
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/mau-phieu/${template.id}`}
        className="text-sm font-semibold text-teal-800 underline underline-offset-4"
      >
        ← Chi tiết mẫu phiếu
      </Link>
      <div className="mt-5 rounded-2xl border border-teal-200 bg-white p-6 sm:p-8">
        <p className="text-xs font-bold tracking-wider text-teal-800 uppercase">
          Xem trước · Phiên bản {template.version} ·{" "}
          {template.isLocked ? "Đã khóa" : "Bản nháp"}
        </p>
        <h1 className="mt-3 text-3xl font-bold break-words text-slate-950">
          {template.name}
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Đây là bản xem trước từ nội dung đã lưu. Thử trả lời để kiểm tra cách
          hiển thị. Các lựa chọn chỉ tồn tại trên trang hiện tại;
          khi rời hoặc tải lại trang, chúng sẽ được bỏ.
        </p>
        <p className="mt-3 text-sm font-semibold text-teal-900">
          Không gửi phiếu khảo sát hoặc lưu phản hồi trong chế độ xem trước.
        </p>
      </div>
      <form onSubmit={check} className="mt-6 space-y-6" noValidate>
        {template.groups.map((group, groupIndex) => (
          <section
            key={group.id}
            aria-labelledby={`preview-group-${group.id}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"
          >
            <h2
              id={`preview-group-${group.id}`}
              className="text-xl font-bold break-words text-slate-950"
            >
              {groupIndex + 1}. {group.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Trọng số nhóm: {group.weight}
            </p>
            {group.isAssessmentGroup && (
              <p className="mt-2 text-sm font-semibold text-teal-800">
                Nhóm tiêu chí kiểm tra, đánh giá
              </p>
            )}
            <div className="mt-6 space-y-7">
              {group.questions.map((question, questionIndex) => {
                const answer = answers[question.id] ?? {};
                const values =
                  question.type === "LIKERT"
                    ? Array.from(
                        { length: question.scaleMax ?? 5 },
                        (_, at) => ({
                          id: String(at + 1),
                          label: String(at + 1),
                        }),
                      )
                    : question.type === "BOOLEAN"
                      ? [
                          { id: "true", label: "Có" },
                          { id: "false", label: "Không" },
                        ]
                      : question.options;
                return (
                  <fieldset
                    key={question.id}
                    id={`preview-question-${question.id}`}
                    tabIndex={-1}
                    className="min-w-0 rounded-xl border border-slate-200 p-4 outline-offset-4 focus:outline-2 focus:outline-teal-700"
                  >
                    <legend className="max-w-full px-2 text-base font-semibold break-words text-slate-900">
                      {groupIndex + 1}.{questionIndex + 1}. {question.label}{" "}
                      {question.required && (
                        <span className="text-red-700">
                          * <span className="sr-only">Bắt buộc</span>
                        </span>
                      )}
                    </legend>
                    <p className="mb-4 text-xs leading-6 text-slate-600">
                      {questionLabels[question.type]} · Trọng số{" "}
                      {question.weight} ·{" "}
                      {question.required ? "Bắt buộc" : "Không bắt buộc"}
                      {question.type === "LIKERT"
                        ? ` · 1–${question.scaleMax} điểm`
                        : ""}
                    </p>
                    {question.type === "TEXT" ? (
                      <>
                        <label
                          htmlFor={`preview-text-${question.id}`}
                          className="sr-only"
                        >
                          Câu trả lời cho {question.label}
                        </label>
                        <textarea
                          id={`preview-text-${question.id}`}
                          maxLength={10000}
                          rows={4}
                          className={inputStyle}
                          disabled={!!answer.na}
                          value={answer.text ?? ""}
                          onChange={(event) =>
                            update(question.id, { text: event.target.value })
                          }
                        />
                      </>
                    ) : (
                      <div
                        className={
                          question.type === "LIKERT"
                            ? "flex flex-wrap gap-3"
                            : "space-y-3"
                        }
                      >
                        {values.map((value) => (
                          <label
                            key={value.id}
                            className={`flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700 ${answer.na ? "opacity-50" : "cursor-pointer hover:border-teal-500"}`}
                          >
                            <input
                              type={
                                question.type === "MULTIPLE_CHOICE"
                                  ? "checkbox"
                                  : "radio"
                              }
                              name={`preview-${question.id}`}
                              value={value.id}
                              checked={
                                answer.values?.includes(value.id) ?? false
                              }
                              disabled={!!answer.na}
                              className="mt-1 size-4 shrink-0 accent-teal-800"
                              onChange={(event) =>
                                update(question.id, {
                                  values:
                                    question.type === "MULTIPLE_CHOICE"
                                      ? event.target.checked
                                        ? [...(answer.values ?? []), value.id]
                                        : (answer.values ?? []).filter(
                                            (selected) => selected !== value.id,
                                          )
                                      : [value.id],
                                })
                              }
                            />
                            <span className="min-w-0 break-words">
                              {value.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                    {question.allowNA && (
                      <label className="mt-4 flex items-center gap-3 border-t border-slate-200 pt-4 text-sm font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={answer.na ?? false}
                          className="size-4 accent-teal-800"
                          onChange={(event) =>
                            update(question.id, {
                              na: event.target.checked,
                              ...(event.target.checked
                                ? { values: [], text: "" }
                                : {}),
                            })
                          }
                        />
                        Không áp dụng
                      </label>
                    )}
                  </fieldset>
                );
              })}
            </div>
          </section>
        ))}
        <Notice message={error} error />
        <Notice message={message} />
        <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <button className={buttonStyle}>Kiểm tra bản xem trước</button>
          <button
            type="button"
            className={secondaryStyle}
            onClick={() => {
              setAnswers({});
              setError(undefined);
              setMessage("Đã xóa lựa chọn trong bản xem trước.");
            }}
          >
            Xóa lựa chọn xem trước
          </button>
        </div>
      </form>
    </div>
  );
}
