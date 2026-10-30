"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  buttonStyle,
  Field,
  inputStyle,
  Notice,
  secondaryStyle,
} from "../admin/ui";
import { templateRequest, TemplateRequestError } from "./template-client";
import {
  messageOf,
  questionLabels,
  type QuestionKind,
  type TemplateDetail,
  type TemplateInput,
} from "./types";

type DraftQuestion = {
  key: string;
  label: string;
  type: QuestionKind;
  required: boolean;
  allowNA: boolean;
  weight: number;
  scaleMax: number;
  options: { key: string; label: string }[];
};
type DraftGroup = {
  key: string;
  title: string;
  weight: number;
  isAssessmentGroup: boolean;
  questions: DraftQuestion[];
};
const option = (label = "") => ({ key: crypto.randomUUID(), label });
const newQuestion = (): DraftQuestion => ({
  key: crypto.randomUUID(),
  label: "",
  type: "LIKERT",
  required: true,
  allowNA: false,
  weight: 1,
  scaleMax: 5,
  options: [],
});
const newGroup = (): DraftGroup => ({
  key: crypto.randomUUID(),
  title: "",
  weight: 1,
  isAssessmentGroup: false,
  questions: [newQuestion()],
});
function toDraft(item?: TemplateDetail): DraftGroup[] {
  return item
    ? item.groups.map((group) => ({
        key: group.id,
        title: group.title,
        weight: group.weight,
        isAssessmentGroup: group.isAssessmentGroup,
        questions: group.questions.map((question) => ({
          key: question.id,
          label: question.label,
          type: question.type,
          required: question.required,
          allowNA: question.allowNA,
          weight: question.weight,
          scaleMax: question.scaleMax ?? 5,
          options: question.options.map((value) => ({
            key: value.id,
            label: value.label,
          })),
        })),
      }))
    : [
        {
          key: "initial-group",
          title: "",
          weight: 1,
          isAssessmentGroup: false,
          questions: [
            {
              key: "initial-question",
              label: "",
              type: "LIKERT",
              required: true,
              allowNA: false,
              weight: 1,
              scaleMax: 5,
              options: [],
            },
          ],
        },
      ];
}
function move<T>(items: T[], index: number, offset: number): T[] {
  const copy = [...items];
  const next = index + offset;
  if (next < 0 || next >= copy.length) return copy;
  [copy[index], copy[next]] = [copy[next], copy[index]];
  return copy;
}
function OrderButtons({
  label,
  index,
  count,
  change,
}: {
  label: string;
  index: number;
  count: number;
  change: (offset: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={secondaryStyle}
        disabled={index === 0}
        aria-label={`Đưa ${label} lên`}
        onClick={() => change(-1)}
      >
        ↑ Lên
      </button>
      <button
        type="button"
        className={secondaryStyle}
        disabled={index === count - 1}
        aria-label={`Đưa ${label} xuống`}
        onClick={() => change(1)}
      >
        ↓ Xuống
      </button>
    </div>
  );
}
type Action = "lock" | "version" | "clone" | "default";
const actionTitles: Record<Action, string> = {
  lock: "Khóa mẫu phiếu",
  version: "Tạo phiên bản mới",
  clone: "Nhân bản mẫu phiếu",
  default: "Đặt làm mẫu mặc định",
};

export function TemplateEditor({ initial }: { initial?: TemplateDetail }) {
  const router = useRouter();
  const [item, setItem] = useState(initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [groups, setGroups] = useState<DraftGroup[]>(() => toDraft(initial));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [conflict, setConflict] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const locked = !!item?.isLocked;
  const actions: Action[] = !locked
    ? ["lock", "version", "clone"]
    : ["version", "clone", ...(!item?.isDefault ? ["default" as const] : [])];
  const questionCount = groups.reduce(
    (sum, group) => sum + group.questions.length,
    0,
  );
  function changeGroups(next: DraftGroup[]) {
    setGroups(next);
    setDirty(true);
    setNotice(undefined);
  }
  function updateGroup(index: number, patch: Partial<DraftGroup>) {
    changeGroups(
      groups.map((group, at) =>
        at === index ? { ...group, ...patch } : group,
      ),
    );
  }
  function updateQuestion(
    groupIndex: number,
    questionIndex: number,
    patch: Partial<DraftQuestion>,
  ) {
    const group = groups[groupIndex];
    updateGroup(groupIndex, {
      questions: group.questions.map((question, at) =>
        at === questionIndex ? { ...question, ...patch } : question,
      ),
    });
  }
  function captureError(error: unknown) {
    setError(messageOf(error));
    if (error instanceof TemplateRequestError && error.status === 409)
      setConflict(true);
  }
  function accept(next: TemplateDetail) {
    setItem(next);
    setName(next.name);
    setGroups(toDraft(next));
    setDirty(false);
    setConflict(false);
    setAction(null);
  }
  async function reload() {
    if (!item) return;
    setBusy(true);
    setError(undefined);
    try {
      const data = await templateRequest<{ item: TemplateDetail }>(
        `/api/templates/${item.id}`,
      );
      accept(data.item);
      setNotice("Đã tải bản hiện tại. Thay đổi chưa lưu đã được bỏ.");
    } catch (error) {
      captureError(error);
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    const input: TemplateInput = {
      name,
      groups: groups.map((group, index) => ({
        title: group.title,
        position: index + 1,
        weight: group.weight,
        isAssessmentGroup: group.isAssessmentGroup,
        questions: group.questions.map((question, at) => ({
          label: question.label,
          type: question.type,
          position: at + 1,
          required: question.required,
          allowNA: question.allowNA,
          weight: question.weight,
          ...(question.type === "LIKERT"
            ? { scaleMin: 1, scaleMax: question.scaleMax }
            : {}),
          options: question.options.map((value, order) => ({
            label: value.label,
            position: order + 1,
          })),
        })),
      })),
    };
    try {
      const data = await templateRequest<{ item: TemplateDetail }>(
        `/api/templates${item ? `/${item.id}` : ""}`,
        { ...input, ...(item ? { expectedRevision: item.revision } : {}) },
      );
      accept(data.item);
      setNotice("Đã lưu mẫu phiếu. Có thể xem trước nội dung đã lưu.");
      if (!item) router.replace(`/mau-phieu/${data.item.id}`);
    } catch (error) {
      captureError(error);
    } finally {
      setBusy(false);
    }
  }
  async function perform(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item || !action) return;
    const selected = action;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const data = await templateRequest<{ item: TemplateDetail }>(
        `/api/templates/${item.id}/${selected}`,
        {
          expectedRevision: item.revision,
          ...(selected === "clone" || selected === "version"
            ? { name: String(form.get("name") ?? "").trim() }
            : {}),
        },
      );
      accept(data.item);
      if (selected === "clone" || selected === "version")
        router.push(`/mau-phieu/${data.item.id}`);
      setNotice(
        selected === "lock"
          ? "Đã khóa mẫu phiếu. Nội dung được giữ nguyên; hãy tạo phiên bản mới khi cần sửa."
          : selected === "default"
            ? "Đã đặt mẫu mặc định."
            : "Đã tạo bản nháp mới, độc lập với nội dung bản gốc.",
      );
    } catch (error) {
      captureError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <Link
        href="/mau-phieu"
        className="text-sm font-semibold text-teal-800 underline underline-offset-4"
      >
        ← Danh sách mẫu phiếu
      </Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wider text-teal-800 uppercase">
            {item
              ? `Phiên bản ${item.version} · ${locked ? "Đã khóa" : "Bản nháp"}${item.isDefault ? " · Mặc định" : ""}`
              : "Mẫu phiếu mới"}
          </p>
          <h1 className="mt-2 text-3xl font-bold break-words text-slate-950">
            {locked ? item?.name : "Trình soạn mẫu phiếu"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Tối đa 20 nhóm và 100 câu hỏi. Trọng số dương, tối đa 1.000 với 4
            chữ số thập phân. Thứ tự hiển thị được lưu theo vị trí bên dưới.
          </p>
        </div>
        {item && !dirty && (
          <Link
            href={`/mau-phieu/${item.id}/xem-truoc`}
            className={secondaryStyle}
          >
            Xem trước bản đã lưu
          </Link>
        )}
      </div>
      {locked && (
        <Notice
          message={
            item?.lockReason ??
            "Mẫu phiếu đã khóa và chỉ được xem. Hãy tạo phiên bản mới để chỉnh sửa."
          }
        />
      )}
      {dirty && (
        <p role="status" className="mt-4 text-sm font-semibold text-amber-800">
          Có thay đổi chưa lưu. Lưu mẫu trước khi xem trước hoặc thao tác phiên
          bản.
        </p>
      )}
      <Notice message={notice} />
      <Notice message={error} error />
      {conflict && (
        <div className="my-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
          <p>
            Bản đang soạn đã thay đổi hoặc bị khóa ở phiên khác. Nội dung chưa
            lưu vẫn được giữ trên trang này; có thể sao chép để đối chiếu
            trước khi tải lại.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void reload()}
            className={`${secondaryStyle} mt-3`}
          >
            Tải lại bản hiện tại (bỏ thay đổi chưa lưu)
          </button>
        </div>
      )}
      {item && (
        <div
          className="mt-5 flex flex-wrap gap-3"
          aria-label="Thao tác phiên bản"
        >
          {actions.map((value) => (
            <button
              key={value}
              type="button"
              disabled={busy || dirty}
              className={secondaryStyle}
              onClick={() => {
                setAction(value);
                setError(undefined);
              }}
            >
              {actionTitles[value]}
            </button>
          ))}
        </div>
      )}
      {action && item && (
        <section
          aria-labelledby="template-action-title"
          className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-5"
        >
          <h2
            id="template-action-title"
            className="text-lg font-bold text-slate-950"
          >
            {actionTitles[action]}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            {action === "lock"
              ? "Sau khi khóa, nội dung mẫu phiếu không thể chỉnh sửa trực tiếp. Mọi thay đổi phải thực hiện trên phiên bản mới."
              : action === "version"
                ? "Tạo bản nháp có số phiên bản tiếp theo trong cùng họ mẫu, với mã nhóm/câu hỏi mới. Bản gốc giữ nguyên."
                : action === "clone"
                  ? "Tạo một họ mẫu độc lập, bắt đầu từ phiên bản 1. Bản gốc giữ nguyên."
                  : "Mẫu đã khóa này sẽ được đề xuất khi cán bộ ĐBCL chọn dùng mẫu mặc định. Mẫu mặc định trước đó vẫn giữ nguyên nội dung."}
          </p>
          <form className="mt-4 space-y-4" onSubmit={perform}>
            <fieldset disabled={busy} className="space-y-4">
              {(action === "version" || action === "clone") && (
                <Field label="Tên bản nháp mới" id="template-action-name">
                  <input
                    id="template-action-name"
                    name="name"
                    required
                    maxLength={200}
                    defaultValue={
                      action === "clone"
                        ? `${item.name.slice(0, 180)} (bản sao)`
                        : item.name
                    }
                    className={inputStyle}
                  />
                </Field>
              )}
              <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                <input
                  type="checkbox"
                  required
                  className="mt-1 size-4 shrink-0 accent-teal-800"
                />
                Tôi đã kiểm tra mẫu phiếu và xác nhận thao tác này.
              </label>
            </fieldset>
            <div className="flex flex-wrap gap-3">
              <button disabled={busy} className={buttonStyle}>
                {busy
                  ? "Đang xử lý…"
                  : `Xác nhận ${actionTitles[action].toLowerCase()}`}
              </button>
              <button
                disabled={busy}
                type="button"
                onClick={() => setAction(null)}
                className={secondaryStyle}
              >
                Hủy
              </button>
            </div>
          </form>
        </section>
      )}
      {!locked && (
        <form onSubmit={save} className="mt-7 space-y-6">
          <fieldset disabled={busy} className="space-y-6 disabled:opacity-60">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <Field label="Tên mẫu phiếu" id="template-name">
                <input
                  id="template-name"
                  required
                  maxLength={200}
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setDirty(true);
                  }}
                  className={inputStyle}
                />
              </Field>
            </div>
            {groups.map((group, groupIndex) => (
              <section
                key={group.key}
                aria-labelledby={`group-heading-${group.key}`}
                className="min-w-0 rounded-2xl border border-teal-200 bg-white p-4 sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2
                    id={`group-heading-${group.key}`}
                    className="text-lg font-bold text-teal-900"
                  >
                    Nhóm {groupIndex + 1}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <OrderButtons
                      label={`nhóm ${groupIndex + 1}`}
                      index={groupIndex}
                      count={groups.length}
                      change={(offset) =>
                        changeGroups(move(groups, groupIndex, offset))
                      }
                    />
                    <button
                      type="button"
                      disabled={groups.length === 1}
                      className={secondaryStyle}
                      onClick={() =>
                        changeGroups(
                          groups.filter((_, at) => at !== groupIndex),
                        )
                      }
                    >
                      Xóa nhóm {groupIndex + 1}
                    </button>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px]">
                  <Field
                    label="Tên nhóm tiêu chí"
                    id={`group-title-${group.key}`}
                  >
                    <input
                      id={`group-title-${group.key}`}
                      required
                      maxLength={200}
                      value={group.title}
                      className={inputStyle}
                      onChange={(event) =>
                        updateGroup(groupIndex, { title: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Trọng số nhóm" id={`group-weight-${group.key}`}>
                    <input
                      id={`group-weight-${group.key}`}
                      type="number"
                      required
                      min="0.0001"
                      max="1000"
                      step="0.0001"
                      value={group.weight}
                      className={inputStyle}
                      onChange={(event) =>
                        updateGroup(groupIndex, {
                          weight: Number(event.target.value),
                        })
                      }
                    />
                  </Field>
                </div>
                <label className="mt-4 flex items-start gap-3 text-sm text-slate-700">
                  <input
                    id={`group-assessment-${group.key}`}
                    type="checkbox"
                    checked={group.isAssessmentGroup}
                    onChange={(event) =>
                      updateGroup(groupIndex, {
                        isAssessmentGroup: event.target.checked,
                      })
                    }
                    className="mt-0.5 h-4 w-4 accent-teal-700"
                  />
                  Nhóm tiêu chí kiểm tra, đánh giá
                </label>
                <div className="mt-6 space-y-5">
                  {group.questions.map((question, questionIndex) => (
                    <article
                      key={question.key}
                      className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-bold text-slate-900">
                          Câu {groupIndex + 1}.{questionIndex + 1}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <OrderButtons
                            label={`câu ${groupIndex + 1}.${questionIndex + 1}`}
                            index={questionIndex}
                            count={group.questions.length}
                            change={(offset) =>
                              updateGroup(groupIndex, {
                                questions: move(
                                  group.questions,
                                  questionIndex,
                                  offset,
                                ),
                              })
                            }
                          />
                          <button
                            type="button"
                            disabled={group.questions.length === 1}
                            className={secondaryStyle}
                            onClick={() =>
                              updateGroup(groupIndex, {
                                questions: group.questions.filter(
                                  (_, at) => at !== questionIndex,
                                ),
                              })
                            }
                          >
                            Xóa câu {groupIndex + 1}.{questionIndex + 1}
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 space-y-4">
                        <Field
                          label="Nội dung câu hỏi"
                          id={`question-label-${question.key}`}
                        >
                          <textarea
                            id={`question-label-${question.key}`}
                            required
                            maxLength={1000}
                            rows={2}
                            className={inputStyle}
                            value={question.label}
                            onChange={(event) =>
                              updateQuestion(groupIndex, questionIndex, {
                                label: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <Field
                            label="Loại câu hỏi"
                            id={`question-type-${question.key}`}
                          >
                            <select
                              id={`question-type-${question.key}`}
                              value={question.type}
                              className={inputStyle}
                              onChange={(event) => {
                                const type = event.target.value as QuestionKind;
                                const choice =
                                  type === "SINGLE_CHOICE" ||
                                  type === "MULTIPLE_CHOICE";
                                updateQuestion(groupIndex, questionIndex, {
                                  type,
                                  options: choice
                                    ? question.options.length >= 2
                                      ? question.options
                                      : [option(), option()]
                                    : [],
                                });
                              }}
                            >
                              {Object.entries(questionLabels).map(
                                ([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </select>
                          </Field>
                          <Field
                            label="Trọng số câu"
                            id={`question-weight-${question.key}`}
                          >
                            <input
                              id={`question-weight-${question.key}`}
                              type="number"
                              required
                              min="0.0001"
                              max="1000"
                              step="0.0001"
                              className={inputStyle}
                              value={question.weight}
                              onChange={(event) =>
                                updateQuestion(groupIndex, questionIndex, {
                                  weight: Number(event.target.value),
                                })
                              }
                            />
                          </Field>
                          {question.type === "LIKERT" && (
                            <Field
                              label="Thang điểm"
                              id={`question-scale-${question.key}`}
                            >
                              <select
                                id={`question-scale-${question.key}`}
                                className={inputStyle}
                                value={question.scaleMax}
                                onChange={(event) =>
                                  updateQuestion(groupIndex, questionIndex, {
                                    scaleMax: Number(event.target.value),
                                  })
                                }
                              >
                                <option value={5}>1–5 điểm</option>
                                <option value={4}>1–4 điểm</option>
                              </select>
                            </Field>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-3">
                          <label className="flex items-center gap-3 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={question.required}
                              className="size-4 accent-teal-800"
                              onChange={(event) =>
                                updateQuestion(groupIndex, questionIndex, {
                                  required: event.target.checked,
                                })
                              }
                            />
                            Bắt buộc trả lời
                          </label>
                          <label className="flex items-center gap-3 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={question.allowNA}
                              className="size-4 accent-teal-800"
                              onChange={(event) =>
                                updateQuestion(groupIndex, questionIndex, {
                                  allowNA: event.target.checked,
                                })
                              }
                            />
                            Cho phép Không áp dụng
                          </label>
                        </div>
                        {(question.type === "SINGLE_CHOICE" ||
                          question.type === "MULTIPLE_CHOICE") && (
                          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-sm font-semibold text-slate-800">
                              Phương án trả lời (2–20, không trùng tên)
                            </p>
                            {question.options.map((value, optionIndex) => (
                              <div
                                key={value.key}
                                className="flex flex-wrap items-end gap-3"
                              >
                                <div className="min-w-0 flex-1 basis-44">
                                  <Field
                                    label={`Phương án ${optionIndex + 1}`}
                                    id={`option-${value.key}`}
                                  >
                                    <input
                                      id={`option-${value.key}`}
                                      required
                                      maxLength={500}
                                      value={value.label}
                                      className={inputStyle}
                                      onChange={(event) =>
                                        updateQuestion(
                                          groupIndex,
                                          questionIndex,
                                          {
                                            options: question.options.map(
                                              (entry, at) =>
                                                at === optionIndex
                                                  ? {
                                                      ...entry,
                                                      label: event.target.value,
                                                    }
                                                  : entry,
                                            ),
                                          },
                                        )
                                      }
                                    />
                                  </Field>
                                </div>
                                <OrderButtons
                                  label={`phương án ${optionIndex + 1} câu ${groupIndex + 1}.${questionIndex + 1}`}
                                  index={optionIndex}
                                  count={question.options.length}
                                  change={(offset) =>
                                    updateQuestion(groupIndex, questionIndex, {
                                      options: move(
                                        question.options,
                                        optionIndex,
                                        offset,
                                      ),
                                    })
                                  }
                                />
                                <button
                                  type="button"
                                  className={secondaryStyle}
                                  disabled={question.options.length <= 2}
                                  aria-label={`Xóa phương án ${optionIndex + 1} câu ${groupIndex + 1}.${questionIndex + 1}`}
                                  onClick={() =>
                                    updateQuestion(groupIndex, questionIndex, {
                                      options: question.options.filter(
                                        (_, at) => at !== optionIndex,
                                      ),
                                    })
                                  }
                                >
                                  Xóa
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              className={secondaryStyle}
                              disabled={question.options.length >= 20}
                              onClick={() =>
                                updateQuestion(groupIndex, questionIndex, {
                                  options: [...question.options, option()],
                                })
                              }
                            >
                              + Thêm phương án
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={questionCount >= 100}
                  className={`${secondaryStyle} mt-5`}
                  onClick={() =>
                    updateGroup(groupIndex, {
                      questions: [...group.questions, newQuestion()],
                    })
                  }
                >
                  + Thêm câu hỏi vào nhóm {groupIndex + 1}
                </button>
              </section>
            ))}
            <button
              type="button"
              disabled={groups.length >= 20 || questionCount >= 100}
              className={secondaryStyle}
              onClick={() => changeGroups([...groups, newGroup()])}
            >
              + Thêm nhóm tiêu chí
            </button>
          </fieldset>
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5">
            <button disabled={busy || conflict} className={buttonStyle}>
              {busy ? "Đang lưu…" : "Lưu mẫu phiếu"}
            </button>
            <p className="text-sm text-slate-600">
              {groups.length} nhóm · {questionCount} câu hỏi
            </p>
          </div>
        </form>
      )}
      {locked && item && (
        <div className="mt-7 space-y-5">
          {item.groups.map((group, index) => (
            <section
              key={group.id}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <h2 className="text-lg font-bold text-slate-950">
                {index + 1}. {group.title}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Trọng số nhóm: {group.weight}
              </p>
              {group.isAssessmentGroup && (
                <p className="mt-2 text-sm font-semibold text-teal-800">
                  Nhóm tiêu chí kiểm tra, đánh giá
                </p>
              )}
              <ol className="mt-4 space-y-4">
                {group.questions.map((question, at) => (
                  <li key={question.id} className="rounded-xl bg-slate-50 p-4">
                    <p className="font-semibold break-words text-slate-900">
                      {index + 1}.{at + 1}. {question.label}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {questionLabels[question.type]}
                      {question.type === "LIKERT"
                        ? ` 1–${question.scaleMax}`
                        : ""}{" "}
                      · Trọng số {question.weight} ·{" "}
                      {question.required ? "Bắt buộc" : "Không bắt buộc"}
                      {question.allowNA ? " · Cho phép Không áp dụng" : ""}
                    </p>
                    {question.options.length > 0 && (
                      <ul className="mt-2 list-inside list-disc text-sm leading-7 text-slate-600">
                        {question.options.map((value) => (
                          <li key={value.id} className="break-words">
                            {value.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
