"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import {
  buttonStyle,
  Field,
  inputStyle,
  Notice,
  secondaryStyle,
} from "../admin/ui";
import { useClientReady } from "../auth/use-client-ready";
import {
  feedbackError,
  feedbackRequest,
  useFeedbackResource,
} from "./feedback-client";
import {
  categoryLabels,
  severityLabels,
  validateFeedbackFiles,
  violationLabels,
} from "./labels";
import type {
  FeedbackCategory,
  FeedbackOptions,
} from "@/server/services/feedback-types";

export function FeedbackCreate() {
  const ready = useClientReady();
  const options = useFeedbackResource<{ item: FeedbackOptions }>(
    "/api/feedback/options",
  );
  const [category, setCategory] = useState<FeedbackCategory>("GIANG_DAY");
  const [severity, setSeverity] = useState("GOP_Y");
  const [isAnonymous, setAnonymous] = useState(true);
  const [identityLevel, setIdentityLevel] = useState("AN_DANH_HOAN_TOAN");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState("");
  const [uploaded, setUploaded] = useState(false);
  const pending = useRef(false);
  const requestId = useRef("");
  const formRef = useRef<HTMLFormElement>(null);
  const serious = category === "KHIEU_NAI_NGHIEM_TRONG";
  const blocked = !ready || busy || !options.data;

  async function upload(feedbackId: string) {
    if (!files.length) {
      setUploaded(true);
      return;
    }
    const body = new FormData();
    for (const file of files) body.append("files", file);
    await feedbackRequest(`/api/feedback/${feedbackId}/attachments`, body);
    setUploaded(true);
    setFiles([]);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked || pending.current) return;
    const fileError = validateFeedbackFiles(files);
    if (fileError) {
      setError(fileError);
      return;
    }
    const values = new FormData(event.currentTarget);
    pending.current = true;
    setBusy(true);
    setError("");
    requestId.current ||= crypto.randomUUID();
    try {
      const result = await feedbackRequest<{ item: { id: string } }>(
        "/api/feedback",
        {
          sectionId: String(values.get("sectionId") ?? ""),
          category,
          severity: serious
            ? "KHIEU_NAI"
            : String(values.get("severity") ?? "GOP_Y"),
          title: String(values.get("title") ?? "").trim(),
          body: String(values.get("body") ?? "").trim(),
          isAnonymous: serious ? true : isAnonymous,
          ...(serious
            ? {
                identityLevel,
                violation: String(values.get("violation") ?? ""),
                acknowledgedSerious: values.get("acknowledgedSerious") === "on",
              }
            : {}),
          requestId: requestId.current,
        },
      );
      setCreatedId(result.item.id);
      formRef.current?.reset();
      await upload(result.item.id);
    } catch (caught) {
      setError(feedbackError(caught));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  if (createdId)
    return (
      <>
        <h1 className="text-3xl font-bold text-slate-950">Đã gửi phản hồi</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Phản hồi đã được lưu và chuyển đến đơn vị xử lý. Sinh viên có thể theo
          dõi hoặc trao đổi thêm tại trang chi tiết.
        </p>
        <Notice error message={error} />
        {!uploaded && files.length > 0 && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm leading-7 text-amber-900">
              Phản hồi đã gửi, phần tệp đính kèm chưa hoàn tất. Không cần gửi
              lại phản hồi.
            </p>
            <button
              className={`${secondaryStyle} mt-4`}
              disabled={busy}
              onClick={async () => {
                if (pending.current) return;
                pending.current = true;
                setBusy(true);
                setError("");
                try {
                  await upload(createdId);
                } catch (caught) {
                  setError(feedbackError(caught));
                } finally {
                  pending.current = false;
                  setBusy(false);
                }
              }}
            >
              {busy ? "Đang tải tệp…" : "Thử tải tệp đính kèm lại"}
            </button>
            <p className="mt-3 text-xs leading-6 text-amber-900">
              Nếu kết nối bị ngắt sau khi tải tệp, mở chi tiết để kiểm tra danh
              sách tệp trước khi thử lại.
            </p>
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/phan-hoi/${createdId}`} className={buttonStyle}>
            Xem phản hồi vừa gửi
          </Link>
          <Link href="/phan-hoi" className={secondaryStyle}>
            Danh sách phản hồi
          </Link>
        </div>
      </>
    );

  return (
    <>
      <h1 className="text-3xl font-bold text-slate-950">
        Gửi phản hồi môn học
      </h1>
      <Notice error message={options.error ?? error} />
      {options.loading && (
        <p role="status" className="py-8 text-sm text-slate-500">
          Đang tải lớp học phần…
        </p>
      )}
      {options.error && (
        <button className={secondaryStyle} onClick={options.reload}>
          Tải lại dữ liệu
        </button>
      )}
      {options.data && !options.data.item.sections.length && (
        <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600">
          Chưa có lớp học phần đủ điều kiện gửi phản hồi trong học kỳ được phép.
        </p>
      )}
      {options.data && options.data.item.sections.length > 0 && (
        <form
          ref={formRef}
          method="post"
          onSubmit={submit}
          aria-busy={busy}
          className="mt-6 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"
        >
          <Field label="Lớp học phần" id="feedback-section">
            <select
              required
              id="feedback-section"
              name="sectionId"
              disabled={blocked}
              className={inputStyle}
              defaultValue=""
            >
              <option value="" disabled>
                Chưa chọn lớp học phần
              </option>
              {options.data.item.sections.map((section) => (
                <option
                  key={section.id}
                  value={section.id}
                  disabled={section.semesterLocked}
                >
                  {section.code} · {section.courseName} · {section.semesterName}
                  {section.semesterLocked ? " (học kỳ đã khóa)" : ""}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Loại phản hồi" id="feedback-category">
              <select
                id="feedback-category"
                value={category}
                disabled={blocked}
                className={inputStyle}
                onChange={(event) =>
                  setCategory(event.target.value as FeedbackCategory)
                }
              >
                {options.data.item.categories.map((value) => (
                  <option key={value} value={value}>
                    {categoryLabels[value] ?? value}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mức độ" id="feedback-severity">
              <select
                id="feedback-severity"
                name="severity"
                disabled={blocked || serious}
                value={serious ? "KHIEU_NAI" : severity}
                onChange={(event) => setSeverity(event.target.value)}
                className={inputStyle}
              >
                {options.data.item.severities.map((value) => (
                  <option key={value} value={value}>
                    {severityLabels[value] ?? value}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {category === "THI_KET_THUC_HOC_PHAN" && (
            <div
              role="note"
              className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900"
            >
              {options.data.item.examNotice}
            </div>
          )}
          {serious ? (
            <fieldset className="space-y-5 rounded-xl border border-amber-200 bg-amber-50 p-5">
              <legend className="px-2 text-sm font-bold text-amber-950">
                Khiếu nại chính thức
              </legend>
              <p className="text-sm leading-7 text-amber-950">
                Hồ sơ được chuyển đến Phòng Thanh tra. Nêu cụ thể sự việc, thời
                điểm và lớp học phần liên quan. Hệ thống ghi nhận ở mức quản lý,
                không thay thế quy trình thanh tra hoặc kỷ luật chính thức của
                trường.
              </p>
              <Field label="Loại vi phạm" id="feedback-violation">
                <select
                  id="feedback-violation"
                  name="violation"
                  required
                  disabled={blocked}
                  className={inputStyle}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Chưa chọn loại vi phạm
                  </option>
                  {options.data.item.violations.map((value) => (
                    <option key={value} value={value}>
                      {violationLabels[value] ?? value}
                    </option>
                  ))}
                </select>
              </Field>
              <fieldset className="space-y-3">
                <legend className="mb-3 text-sm font-semibold text-slate-800">
                  Mức độ hiển thị danh tính
                </legend>
                {[
                  {
                    value: "AN_DANH_HOAN_TOAN",
                    label: "Ẩn danh hoàn toàn với người xử lý",
                  },
                  {
                    value: "CHO_THANH_TRA_BIET",
                    label: "Chỉ cho Phòng Thanh tra biết danh tính",
                  },
                ].map((choice) => (
                  <label
                    key={choice.value}
                    className="flex items-start gap-3 text-sm leading-6 text-slate-800"
                  >
                    <input
                      className="mt-1 accent-teal-800"
                      type="radio"
                      name="identityLevel"
                      value={choice.value}
                      checked={identityLevel === choice.value}
                      disabled={blocked}
                      onChange={() => setIdentityLevel(choice.value)}
                    />
                    {choice.label}
                  </label>
                ))}
              </fieldset>
              <p className="text-xs leading-6 text-slate-600">
                Hệ thống vẫn lưu thông tin để trao đổi và thông báo đúng sinh
                viên. Danh tính không được cung cấp cho người bị phản ánh.
              </p>
              <label className="flex items-start gap-3 text-sm leading-6 text-slate-800">
                <input
                  type="checkbox"
                  name="acknowledgedSerious"
                  required
                  disabled={blocked}
                  className="mt-1 accent-teal-800"
                />
                Tôi đã đọc và hiểu nội dung về khiếu nại chính thức.
              </label>
            </fieldset>
          ) : (
            <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
              <input
                type="checkbox"
                checked={isAnonymous}
                disabled={blocked}
                onChange={(event) => setAnonymous(event.target.checked)}
                className="mt-1 accent-teal-800"
              />
              Ẩn danh với người xử lý. Hệ thống vẫn lưu thông tin để sinh viên
              theo dõi và trao đổi.
            </label>
          )}
          <Field label="Tiêu đề" id="feedback-title">
            <input
              id="feedback-title"
              name="title"
              required
              minLength={5}
              maxLength={200}
              disabled={blocked}
              className={inputStyle}
            />
          </Field>
          <Field label="Nội dung phản hồi" id="feedback-body">
            <textarea
              id="feedback-body"
              name="body"
              required
              minLength={10}
              maxLength={10000}
              rows={7}
              disabled={blocked}
              className={inputStyle}
            />
          </Field>
          <Field
            label="Tệp đính kèm"
            id="feedback-files"
            hint="Tối đa 3 tệp PNG, JPG hoặc PDF, mỗi tệp không quá 5 MB. Tên tệp được ẩn với người xử lý; nội dung và thông tin bên trong tệp có thể tiết lộ danh tính."
          >
            <input
              id="feedback-files"
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.pdf"
              disabled={blocked}
              className={inputStyle}
              onChange={(event) => {
                const chosen = Array.from(event.target.files ?? []);
                const problem = validateFeedbackFiles(chosen);
                setError(problem ?? "");
                setFiles(problem ? [] : chosen);
                if (problem) event.target.value = "";
              }}
            />
          </Field>
          <div className="flex flex-wrap gap-3">
            <button type="submit" className={buttonStyle} disabled={blocked}>
              {busy ? "Đang gửi…" : "Gửi phản hồi"}
            </button>
            <Link href="/phan-hoi" className={secondaryStyle}>
              Về danh sách
            </Link>
          </div>
        </form>
      )}
    </>
  );
}
