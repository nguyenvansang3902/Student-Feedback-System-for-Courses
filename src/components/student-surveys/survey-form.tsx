"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  StudentSurveyAnswerInput,
  StudentSurveyDetail,
  StudentSurveyQuestion,
  StudentSurveySubmitResult,
} from "@/server/services/student-survey-types";
import {
  buttonStyle,
  inputStyle,
  Notice,
  secondaryStyle,
  vietnamTime,
} from "../admin/ui";
import {
  surveyMessageOf,
  surveyRequest,
  SurveyRequestError,
} from "./survey-client";
import {
  clearTaskSurveyDrafts,
  clearAllSurveyDrafts,
  isSurveyAnswerFilled,
  loadSurveyDraft,
  saveSurveyDraft,
  subscribeSurveyDraftEvents,
  type DraftContext,
  type SurveyAnswers,
} from "./survey-draft";
import { availabilityLabels, SurveyStatus } from "./survey-status";
import {
  createSurveyClock,
  readSurveyClock,
  syncSurveyClock,
} from "./survey-clock";

type TaskResult = { item: StudentSurveyDetail; serverTime: string };

const questionLabels = {
  LIKERT: "Thang điểm",
  SINGLE_CHOICE: "Chọn một đáp án",
  MULTIPLE_CHOICE: "Chọn nhiều đáp án",
  BOOLEAN: "Có / Không",
  TEXT: "Tự luận",
};
const draftMessages = {
  empty:
    "Bản nháp được lưu tự động trên trình duyệt này khi sinh viên trả lời.",
  restored: "Đã khôi phục bản nháp của nhiệm vụ và phiên bản mẫu này.",
  expired: "Bản nháp cũ đã hết hạn và được xóa khỏi trình duyệt.",
  invalid:
    "Bản nháp cũ không hợp lệ và đã được xóa. Sinh viên có thể trả lời lại.",
  unavailable:
    "Trình duyệt không cho lưu nháp. Hãy giữ trang này mở đến khi nộp thành công.",
};

function SurveyQuestion({
  question,
  index,
  answer,
  disabled,
  invalid,
  change,
}: {
  question: StudentSurveyQuestion;
  index: string;
  answer?: StudentSurveyAnswerInput;
  disabled: boolean;
  invalid: boolean;
  change: (answer: StudentSurveyAnswerInput) => void;
}) {
  const id = `survey-question-${question.id}`;
  const na = !!answer?.isNotApplicable;
  const set = (value: Omit<StudentSurveyAnswerInput, "questionId">) =>
    change({ questionId: question.id, ...value });
  const choices =
    question.type === "LIKERT"
      ? Array.from(
          { length: (question.scaleMax ?? 5) - (question.scaleMin ?? 1) + 1 },
          (_, at) => ({
            id: String(at + (question.scaleMin ?? 1)),
            label: String(at + (question.scaleMin ?? 1)),
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
      id={id}
      tabIndex={-1}
      disabled={disabled}
      aria-describedby={`${id}-hint${invalid ? ` ${id}-error` : ""}`}
      className={`min-w-0 rounded-xl border p-4 outline-offset-4 focus:outline-2 focus:outline-teal-700 ${invalid ? "border-red-300 bg-red-50/30" : "border-slate-200"}`}
    >
      <legend className="max-w-full px-2 text-base font-semibold break-words text-slate-900">
        {index}. {question.label}{" "}
        {question.required && (
          <span className="text-red-700">
            * <span className="sr-only">Bắt buộc</span>
          </span>
        )}
      </legend>
      <p id={`${id}-hint`} className="mb-4 text-xs leading-6 text-slate-600">
        {questionLabels[question.type]} ·{" "}
        {question.required ? "Bắt buộc" : "Không bắt buộc"}
        {question.type === "LIKERT"
          ? ` · ${question.scaleMin}–${question.scaleMax} điểm`
          : ""}
      </p>
      {question.type === "TEXT" ? (
        <>
          <label htmlFor={`${id}-text`} className="sr-only">
            Câu trả lời cho {question.label}
          </label>
          <textarea
            id={`${id}-text`}
            rows={4}
            maxLength={4000}
            className={inputStyle}
            value={answer?.valueText ?? ""}
            disabled={na || disabled}
            aria-required={question.required && !na}
            aria-invalid={invalid}
            onChange={(event) => set({ valueText: event.target.value })}
          />
          <p className="mt-2 text-right text-xs text-slate-500">
            {answer?.valueText?.length ?? 0} / 4.000 ký tự
          </p>
        </>
      ) : (
        <div
          className={
            question.type === "LIKERT" ? "flex flex-wrap gap-3" : "space-y-3"
          }
        >
          {choices.map((choice) => {
            const checked =
              question.type === "LIKERT"
                ? answer?.valueNumber === Number(choice.id)
                : question.type === "BOOLEAN"
                  ? typeof answer?.valueBoolean === "boolean" &&
                    String(answer.valueBoolean) === choice.id
                  : !!answer?.valueOptionIds?.includes(choice.id);
            return (
              <label
                key={choice.id}
                className={`flex min-w-0 items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-6 ${checked && !na ? "border-teal-700 bg-teal-50 text-teal-950" : "border-slate-200 text-slate-700"} ${na ? "opacity-50" : ""}`}
              >
                <input
                  type={
                    question.type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"
                  }
                  name={id}
                  value={choice.id}
                  checked={!na && checked}
                  disabled={na || disabled}
                  aria-required={question.required && !na}
                  aria-invalid={invalid}
                  className="mt-1 h-4 w-4 shrink-0 accent-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
                  onChange={(event) => {
                    if (question.type === "LIKERT")
                      set({ valueNumber: Number(choice.id) });
                    else if (question.type === "BOOLEAN")
                      set({ valueBoolean: choice.id === "true" });
                    else if (question.type === "SINGLE_CHOICE")
                      set({ valueOptionIds: [choice.id] });
                    else
                      set({
                        valueOptionIds: event.target.checked
                          ? [...(answer?.valueOptionIds ?? []), choice.id]
                          : (answer?.valueOptionIds ?? []).filter(
                              (value) => value !== choice.id,
                            ),
                      });
                  }}
                />
                <span className="min-w-0 break-words">{choice.label}</span>
              </label>
            );
          })}
        </div>
      )}
      {question.allowNA && (
        <label className="mt-4 flex items-start gap-3 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-700">
          <input
            type="checkbox"
            checked={na}
            disabled={disabled}
            className="mt-1 h-4 w-4 shrink-0 accent-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
            onChange={(event) =>
              set(event.target.checked ? { isNotApplicable: true } : {})
            }
          />
          <span>Không áp dụng với tôi</span>
        </label>
      )}
      {!question.required && !na && isSurveyAnswerFilled(question, answer) && (
        <button
          type="button"
          className="mt-3 rounded text-xs font-semibold text-teal-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
          onClick={() => set({})}
        >
          Bỏ câu trả lời này
        </button>
      )}
      {invalid && (
        <p id={`${id}-error`} className="mt-3 text-sm text-red-800">
          Hãy trả lời câu bắt buộc này hoặc chọn Không áp dụng nếu được phép.
        </p>
      )}
    </fieldset>
  );
}

export function StudentSurveyForm({
  initial,
  userId,
  serverTime,
}: {
  initial: StudentSurveyDetail;
  userId: string;
  serverTime: number;
}) {
  const router = useRouter();
  const [item, setItem] = useState(initial);
  const [draft, setDraft] = useState<{
    ready: boolean;
    answers: SurveyAnswers;
    message: string;
  }>({
    ready: false,
    answers: {},
    message: "Đang kiểm tra bản nháp trên thiết bị…",
  });
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [needsStatusCheck, setNeedsStatusCheck] = useState(false);
  const [invalidIds, setInvalidIds] = useState<string[]>([]);
  const pending = useRef(false);
  const savingAllowed = useRef(true);
  const draftEpoch = useRef(0);
  const initialDraftNotice = useRef<{
    initial: StudentSurveyDetail;
    userId: string;
    state: "invalid" | "expired";
  } | null>(null);
  const clock = useRef(createSurveyClock(serverTime));
  const template = item.template;
  const context: DraftContext | null = template
    ? { userId, taskId: item.id, template, endsAt: item.endsAt }
    : null;
  const questions = template?.groups.flatMap((group) => group.questions) ?? [];
  const answered = questions.filter((question) =>
    isSurveyAnswerFilled(question, draft.answers[question.id]),
  ).length;
  const required = questions.filter((question) => question.required);
  const requiredAnswered = required.filter((question) =>
    isSurveyAnswerFilled(question, draft.answers[question.id]),
  ).length;

  useEffect(() => {
    if (!initial.canSubmit || !initial.template) {
      if (
        initial.status === "DONE" ||
        initial.availability === "CLOSED" ||
        initial.availability === "SEMESTER_LOCKED"
      ) {
        initialDraftNotice.current = null;
        clearTaskSurveyDrafts({ userId, taskId: initial.id });
      }
      return;
    }
    const epoch = draftEpoch.current;
    const loaded = loadSurveyDraft(
      {
        userId,
        taskId: initial.id,
        template: initial.template,
        endsAt: initial.endsAt,
      },
      undefined,
      readSurveyClock(clock.current),
    );
    // Replay effect không được làm mất thông báo sau khi nháp hỏng đã bị dọn.
    // Ref chỉ giữ trạng thái thông báo, không giữ thêm bản sao đáp án.
    if (loaded.state === "invalid" || loaded.state === "expired")
      initialDraftNotice.current = { initial, userId, state: loaded.state };
    else if (
      loaded.state === "empty" &&
      initialDraftNotice.current?.initial === initial &&
      initialDraftNotice.current.userId === userId
    )
      loaded.state = initialDraftNotice.current.state;
    queueMicrotask(() => {
      if (!savingAllowed.current || epoch !== draftEpoch.current) return;
      setDraft({
        ready: true,
        answers: loaded.answers,
        message: draftMessages[loaded.state],
      });
    });
  }, [initial, userId]);
  useEffect(() => {
    if (!draft.ready || !item.canSubmit || !item.template || busy) return;
    const timer = setTimeout(() => {
      if (
        savingAllowed.current &&
        !saveSurveyDraft(
          {
            userId,
            taskId: item.id,
            template: item.template!,
            endsAt: item.endsAt,
          },
          draft.answers,
          undefined,
          readSurveyClock(clock.current),
        )
      )
        setDraft((current) => ({
          ...current,
          message: draftMessages.unavailable,
        }));
    }, 500);
    return () => clearTimeout(timer);
  }, [draft.ready, draft.answers, item, userId, busy]);
  useEffect(() => {
    let active = true,
      reading = false;
    const check = async () => {
      if (reading) return;
      reading = true;
      const epoch = draftEpoch.current;
      try {
        const result = await surveyRequest<TaskResult>(
          `/api/student-surveys/${item.id}`,
        );
        if (!active || epoch !== draftEpoch.current) return;
        clock.current = syncSurveyClock(clock.current, result.serverTime);
        setItem(result.item);
        if (
          result.item.status === "DONE" ||
          ["CLOSED", "SEMESTER_LOCKED"].includes(result.item.availability)
        ) {
          savingAllowed.current = false;
          initialDraftNotice.current = null;
          clearTaskSurveyDrafts({ userId, taskId: item.id });
          setDraft({
            ready: false,
            answers: {},
            message:
              "Bản nháp đã được xóa vì nhiệm vụ đã hoàn thành hoặc không còn nhận phiếu.",
          });
          if (result.item.status === "DONE") {
            router.replace(`/khao-sat/${item.id}/da-nop`);
            router.refresh();
          }
        } else if (
          !item.canSubmit &&
          result.item.canSubmit &&
          result.item.template
        ) {
          const loaded = loadSurveyDraft(
            {
              userId,
              taskId: item.id,
              template: result.item.template,
              endsAt: result.item.endsAt,
            },
            undefined,
            readSurveyClock(clock.current),
          );
          savingAllowed.current = true;
          setDraft({
            ready: true,
            answers: loaded.answers,
            message: draftMessages[loaded.state],
          });
        }
      } catch {
        /* Khi offline, giữ nháp và để lần nộp/kiểm trạng thái tiếp theo xác minh ở máy chủ. */
      } finally {
        reading = false;
      }
    };
    const focus = () => {
      void check();
    };
    window.addEventListener("focus", focus);
    const timer = setInterval(() => {
      if (
        item.canSubmit &&
        readSurveyClock(clock.current) > new Date(item.endsAt).getTime()
      )
        void check();
    }, 1000);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, [item.canSubmit, item.endsAt, item.id, router, userId]);

  useEffect(
    () =>
      subscribeSurveyDraftEvents((event) => {
        if (event.kind === "logout") {
          draftEpoch.current++;
          savingAllowed.current = false;
          initialDraftNotice.current = null;
          clearAllSurveyDrafts(undefined, false);
          setDraft({
            ready: false,
            answers: {},
            message: "Sinh viên đã đăng xuất ở tab khác.",
          });
          window.location.replace("/dang-nhap");
          return;
        }
        if (event.userId !== userId || event.taskId !== item.id) return;
        draftEpoch.current++;
        savingAllowed.current = false;
        initialDraftNotice.current = null;
        clearTaskSurveyDrafts({ userId, taskId: item.id }, undefined, false);
        setDraft({
          ready: false,
          answers: {},
          message:
            "Nháp đã được xóa ở tab khác. Hãy kiểm tra trạng thái nhiệm vụ.",
        });
        setNeedsStatusCheck(true);
      }),
    [item.id, userId],
  );

  function completed() {
    savingAllowed.current = false;
    initialDraftNotice.current = null;
    clearTaskSurveyDrafts({ userId, taskId: item.id });
    setDraft({ ready: false, answers: {}, message: "" });
    router.replace(`/khao-sat/${item.id}/da-nop`);
    router.refresh();
  }
  function change(answer: StudentSurveyAnswerInput) {
    if (!savingAllowed.current) return;
    const answers = { ...draft.answers, [answer.questionId]: answer };
    const saved = context
      ? saveSurveyDraft(
          context,
          answers,
          undefined,
          readSurveyClock(clock.current),
        )
      : false;
    setDraft((current) => ({
      ...current,
      answers,
      message: saved ? current.message : draftMessages.unavailable,
    }));
    setInvalidIds((current) =>
      current.filter((id) => id !== answer.questionId),
    );
    setError(undefined);
  }
  function applyTask(
    updated: StudentSurveyDetail,
    serverTime: string,
    epoch: number,
  ) {
    if (epoch !== draftEpoch.current) return false;
    clock.current = syncSurveyClock(clock.current, serverTime);
    setItem(updated);
    savingAllowed.current = updated.canSubmit;
    if (
      updated.canSubmit &&
      updated.template &&
      (!draft.ready ||
        updated.template.id !== template?.id ||
        updated.template.version !== template?.version)
    ) {
      const loaded = loadSurveyDraft(
        {
          userId,
          taskId: updated.id,
          template: updated.template,
          endsAt: updated.endsAt,
        },
        undefined,
        readSurveyClock(clock.current),
      );
      setDraft({
        ready: true,
        answers: loaded.answers,
        message: draftMessages[loaded.state],
      });
    }
    return true;
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      pending.current ||
      !savingAllowed.current ||
      needsStatusCheck ||
      !item.canSubmit ||
      !context ||
      !draft.ready
    )
      return;
    const missing = required.filter(
      (question) => !isSurveyAnswerFilled(question, draft.answers[question.id]),
    );
    setInvalidIds(missing.map((question) => question.id));
    if (missing.length) {
      setError(
        `Còn ${missing.length} câu bắt buộc chưa được trả lời. Vui lòng kiểm tra các câu được đánh dấu.`,
      );
      document.getElementById(`survey-question-${missing[0].id}`)?.focus();
      return;
    }
    pending.current = true;
    setBusy(true);
    setError(undefined);
    saveSurveyDraft(
      context,
      draft.answers,
      undefined,
      readSurveyClock(clock.current),
    );
    try {
      const result = await surveyRequest<{ item: StudentSurveySubmitResult }>(
        `/api/student-surveys/${item.id}/submit`,
        {
          answers: questions
            .filter((question) =>
              isSurveyAnswerFilled(question, draft.answers[question.id]),
            )
            .map((question) => draft.answers[question.id]),
        },
      );
      if (result.item.status !== "DONE")
        throw new Error("Chưa xác định được trạng thái nộp phiếu.");
      completed();
    } catch (submitError) {
      // Mất phản hồi có thể xảy ra sau COMMIT. Chỉ đọc trạng thái, tuyệt đối không tự gửi lại POST.
      try {
        const epoch = draftEpoch.current;
        const result = await surveyRequest<TaskResult>(
          `/api/student-surveys/${item.id}`,
        );
        if (epoch !== draftEpoch.current) return;
        if (result.item.status === "DONE") {
          completed();
          return;
        }
        if (!applyTask(result.item, result.serverTime, epoch)) return;
        if (
          result.item.availability === "CLOSED" ||
          result.item.availability === "SEMESTER_LOCKED"
        ) {
          initialDraftNotice.current = null;
          clearTaskSurveyDrafts({ userId, taskId: item.id });
          setDraft({
            ready: false,
            answers: {},
            message: "Bản nháp đã được xóa vì khảo sát không còn nhận phiếu.",
          });
        }
        setError(
          submitError instanceof SurveyRequestError
            ? `${submitError.message}${result.item.canSubmit ? " Nhiệm vụ vẫn chưa hoàn thành; sinh viên có thể kiểm tra rồi tự nộp lại." : ""}`
            : "Chưa nhận được xác nhận nộp. Nhiệm vụ vẫn chưa hoàn thành; bản nháp được giữ để sinh viên kiểm tra rồi tự nộp lại.",
        );
      } catch {
        setNeedsStatusCheck(true);
        setError(
          "Chưa xác định được phiếu đã nộp hay chưa. Bản nháp vẫn được giữ. Hãy dùng nút Kiểm tra trạng thái trước khi nộp lại.",
        );
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function checkStatus() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    const epoch = draftEpoch.current;
    try {
      const result = await surveyRequest<TaskResult>(
        `/api/student-surveys/${item.id}`,
      );
      if (epoch !== draftEpoch.current) return;
      if (result.item.status === "DONE") {
        completed();
        return;
      }
      setNeedsStatusCheck(false);
      if (!applyTask(result.item, result.serverTime, epoch)) return;
      if (
        !result.item.canSubmit &&
        ["CLOSED", "SEMESTER_LOCKED"].includes(result.item.availability)
      ) {
        initialDraftNotice.current = null;
        clearTaskSurveyDrafts({ userId, taskId: item.id });
        setDraft({
          ready: false,
          answers: {},
          message: "Bản nháp đã được xóa vì khảo sát không còn nhận phiếu.",
        });
      }
      setError(
        result.item.canSubmit
          ? "Nhiệm vụ chưa hoàn thành. Sinh viên có thể kiểm tra câu trả lời rồi nộp."
          : availabilityLabels[result.item.availability],
      );
    } catch (statusError) {
      setError(surveyMessageOf(statusError));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/khao-sat"
        className="rounded text-sm font-semibold text-teal-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
      >
        ← Khảo sát của tôi
      </Link>
      <header className="mt-5 rounded-2xl border border-teal-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-xs leading-6 font-semibold text-teal-800">
            {item.semesterName} · {item.sectionCode}
          </p>
          <SurveyStatus availability={item.availability} />
        </div>
        <h1 className="mt-3 text-3xl font-bold break-words text-slate-950">
          {item.courseName}
        </h1>
        <p className="mt-2 break-words text-sm text-slate-600">
          {item.campaignTitle}
        </p>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Bắt đầu · giờ Việt Nam</dt>
            <dd className="mt-1 text-slate-700">
              {vietnamTime(item.startsAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">
              Kết thúc theo lịch · giờ Việt Nam
            </dt>
            <dd className="mt-1 text-slate-700">{vietnamTime(item.endsAt)}</dd>
          </div>
        </dl>
        <p className="mt-5 text-sm leading-7 text-slate-600">
          Phiếu trả lời được lưu riêng với trạng thái nhiệm vụ; dữ liệu ứng dụng
          không gắn phiếu với tài khoản của sinh viên. Nội dung tự luận có thể
          tự tiết lộ danh tính, vì vậy sinh viên nên tránh ghi tên hoặc mã sinh
          viên.
        </p>
      </header>
      {!item.canSubmit || !template ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900">
            {availabilityLabels[item.availability]}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {item.availability === "NOT_OPEN"
              ? "Sinh viên có thể quay lại trong thời gian đợt khảo sát nhận phiếu."
              : "Nhiệm vụ hiện không nhận phiếu. Trạng thái và thời gian được máy chủ kiểm tra lại khi nộp."}
          </p>
          <Notice
            message={
              draft.message.includes("đã được xóa") ? draft.message : undefined
            }
          />
          <button
            type="button"
            className={`mt-4 ${secondaryStyle}`}
            disabled={busy}
            onClick={() => void checkStatus()}
          >
            Kiểm tra trạng thái
          </button>
          <Notice message={error} error />
        </section>
      ) : (
        <>
          <aside className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950">
            <p className="font-semibold">Lưu ý khi dùng thiết bị chung</p>
            <p>
              Nháp chỉ lưu trên trình duyệt này, tối đa 7 ngày. Người dùng chung
              thiết bị có thể đọc nháp; hãy đăng xuất để xóa nháp sau khi sử
              dụng.
            </p>
            <p role="status" className="mt-2">
              {draft.message}
            </p>
          </aside>
          <form
            onSubmit={(event) => void submit(event)}
            className="mt-6 space-y-6"
            noValidate
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <p className="font-semibold text-slate-900">
                  Tiến trình: {answered}/{questions.length} câu
                </p>
                <p className="text-slate-600">
                  Bắt buộc: {requiredAnswered}/{required.length}
                </p>
              </div>
              <div
                role="progressbar"
                aria-label="Tiến trình trả lời khảo sát"
                aria-valuemin={0}
                aria-valuemax={questions.length}
                aria-valuenow={answered}
                className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
              >
                <div
                  className="h-full rounded-full bg-teal-700"
                  style={{
                    width: `${questions.length ? (answered / questions.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {template.name} · Phiên bản {template.version}. Dấu * là câu bắt
                buộc.
              </p>
            </div>
            {template.groups.map((group, groupIndex) => (
              <section
                key={group.id}
                aria-labelledby={`survey-group-${group.id}`}
                className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"
              >
                <h2
                  id={`survey-group-${group.id}`}
                  className="text-xl font-bold break-words text-slate-950"
                >
                  {groupIndex + 1}. {group.title}
                </h2>
                <div className="mt-6 space-y-7">
                  {group.questions.map((question, questionIndex) => (
                    <SurveyQuestion
                      key={question.id}
                      question={question}
                      index={`${groupIndex + 1}.${questionIndex + 1}`}
                      answer={draft.answers[question.id]}
                      disabled={busy || !draft.ready}
                      invalid={invalidIds.includes(question.id)}
                      change={change}
                    />
                  ))}
                </div>
              </section>
            ))}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
              <h2 className="text-lg font-bold text-slate-950">
                Kiểm tra trước khi nộp
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Mỗi nhiệm vụ chỉ nộp một lần. Sau khi gửi thành công, sinh viên
                không thể đọc lại, sửa hoặc xóa nội dung phiếu.
              </p>
              <Notice message={error} error />
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={busy || needsStatusCheck || !draft.ready}
                  className={buttonStyle}
                >
                  {busy ? "Đang kiểm tra và gửi…" : "Nộp phiếu khảo sát"}
                </button>
                <button
                  type="button"
                  className={secondaryStyle}
                  disabled={busy}
                  onClick={() => void checkStatus()}
                >
                  Kiểm tra trạng thái
                </button>
              </div>
            </section>
          </form>
        </>
      )}
    </div>
  );
}
