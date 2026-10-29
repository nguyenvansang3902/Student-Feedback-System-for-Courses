"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  buttonStyle,
  Field,
  inputStyle,
  Notice,
  secondaryStyle,
  vietnamTime,
} from "../admin/ui";
import {
  campaignRequest,
  CampaignRequestError,
  messageOf,
  useCampaignResource,
} from "./campaign-client";
import { CampaignForm } from "./campaign-form";
import { CampaignProgress } from "./campaign-progress";
import { CampaignReadinessPanel } from "./campaign-readiness-panel";
import {
  CampaignStatus,
  scopeLabels,
  statusLabels,
  vietnamInput,
  vietnamIso,
  type CampaignAction,
  type CampaignCapabilities,
  type CampaignDetail as Detail,
  type CampaignInput,
  type CampaignReadiness,
  type SurveyDefaults,
} from "./types";

const actionLabels: Record<CampaignAction, string> = {
  submit: "Trình PĐT xác nhận",
  confirm: "Xác nhận dữ liệu",
  return: "Trả về bản nháp",
  approve: "Phê duyệt đợt",
  reject: "Từ chối phê duyệt",
  withdraw: "Rút về bản nháp",
  cancel: "Hủy đợt",
  extend: "Gia hạn khảo sát",
  close: "Đóng khảo sát sớm",
};
function actionsFor(
  item: Detail,
  access: CampaignCapabilities,
): CampaignAction[] {
  if (item.semesterLocked) return [];
  const result: CampaignAction[] = [];
  if (access.submit && item.status === "NHAP") result.push("submit");
  if (access.confirm && item.status === "CHO_XAC_NHAN_DL")
    result.push("confirm", "return");
  if (access.approve && item.status === "CHO_DUYET")
    result.push("approve", "reject");
  if (access.operate && item.status === "DA_DUYET") result.push("withdraw");
  if (
    access.operate &&
    ["NHAP", "CHO_XAC_NHAN_DL", "CHO_DUYET", "DA_DUYET"].includes(item.status)
  )
    result.push("cancel");
  if (access.operate && item.status === "DANG_MO")
    result.push("extend", "close");
  return result;
}
function ActionPanel({
  item,
  access,
  dirty,
  ready,
  onSuccess,
}: {
  item: Detail;
  access: CampaignCapabilities;
  dirty: boolean;
  ready?: CampaignReadiness;
  onSuccess: (item: Detail) => void;
}) {
  const actions = actionsFor(item, access);
  const [selected, setSelected] = useState<CampaignAction | "">(
      actions[0] ?? "",
    ),
    [reason, setReason] = useState("");
  const [end, setEnd] = useState(
    vietnamInput(
      new Date(new Date(item.endsAt).getTime() + 86_400_000).toISOString(),
    ),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string>(),
    [conflict, setConflict] = useState(false);
  const operation = useRef<{ key: string; requestId: string } | null>(null);
  const reasonRequired =
    selected === "confirm"
      ? !!ready?.warnings.length
      : ["return", "reject", "withdraw", "cancel", "extend", "close"].includes(
          selected,
        );
  const confirmBlocked =
    selected === "confirm" && (!ready || !ready.canConfirm);
  async function act(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || busy || dirty || confirmBlocked) return;
    setBusy(true);
    setError(undefined);
    setConflict(false);
    try {
      const input = {
        expectedRevision: item.revision,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
        ...(selected === "extend" ? { endsAt: vietnamIso(end) } : {}),
      };
      const key = JSON.stringify({ action: selected, ...input });
      if (operation.current?.key !== key)
        operation.current = { key, requestId: crypto.randomUUID() };
      const data = await campaignRequest<{ item: Detail }>(
        `/api/campaigns/${item.id}/${selected}`,
        { ...input, requestId: operation.current.requestId },
      );
      onSuccess(data.item);
    } catch (problem) {
      setError(messageOf(problem));
      setConflict(
        problem instanceof CampaignRequestError && problem.status === 409,
      );
    } finally {
      setBusy(false);
    }
  }
  if (!actions.length) return null;
  return (
    <section
      aria-labelledby="campaign-actions-title"
      className="rounded-2xl border border-teal-200 bg-teal-50/50 p-5 sm:p-6"
    >
      <h2
        id="campaign-actions-title"
        className="text-lg font-bold text-slate-900"
      >
        Bước tiếp theo
      </h2>
      {dirty && (
        <Notice message="Bản nháp có thay đổi chưa lưu. Lưu thay đổi trước khi thực hiện bước tiếp theo." />
      )}
      <form onSubmit={act} className="mt-5 space-y-5">
        <fieldset disabled={busy || dirty} className="min-w-0 space-y-5">
          <div className="max-w-lg">
            <Field label="Thao tác với đợt" id="campaign-action">
              <select
                id="campaign-action"
                className={inputStyle}
                value={selected}
                onChange={(event) => {
                  setSelected(event.target.value as CampaignAction);
                  setReason("");
                  setError(undefined);
                }}
              >
                {actions.map((action) => (
                  <option value={action} key={action}>
                    {actionLabels[action]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {selected === "submit" && (
            <p className="text-sm leading-7 text-slate-600">
              PĐT sẽ đối chiếu dữ liệu đào tạo trước khi đợt được trình lãnh
              đạo. Sau khi trình, nội dung bản nháp không còn chỉnh trực tiếp.
            </p>
          )}
          {selected === "approve" && (
            <p className="text-sm leading-7 text-slate-600">
              Phê duyệt sẽ khóa mẫu phiếu và giữ nguyên phạm vi. Hệ thống mở
              khảo sát khi đến thời điểm đã đặt.
            </p>
          )}
          {selected === "withdraw" && (
            <p className="text-sm leading-7 text-slate-600">
              Đợt trở về bản nháp để chỉnh sửa. Dữ liệu cần được PĐT xác nhận và
              lãnh đạo duyệt lại; mẫu đã khóa vẫn giữ nguyên.
            </p>
          )}
          {selected === "cancel" && (
            <p className="text-sm leading-7 text-red-800">
              Đợt sẽ chuyển sang đã hủy và không tự mở theo lịch. Không thể hủy
              một đợt đã bắt đầu khảo sát.
            </p>
          )}
          {selected === "close" && (
            <p className="text-sm leading-7 text-red-800">
              Khảo sát kết thúc ngay sau khi đóng sớm. Vui lòng kiểm tra tiến độ
              trước khi xác nhận.
            </p>
          )}
          {selected === "extend" && (
            <Field
              label="Thời điểm kết thúc mới · giờ Việt Nam"
              id="campaign-extend-end"
              hint="Thời điểm mới phải muộn hơn thời điểm kết thúc hiện tại."
            >
              <input
                id="campaign-extend-end"
                type="datetime-local"
                className={inputStyle}
                value={end}
                onChange={(event) => setEnd(event.target.value)}
                required
              />
            </Field>
          )}
          {(reasonRequired || selected === "confirm") && (
            <Field
              label={
                selected === "confirm"
                  ? `Ghi chú xác nhận${reasonRequired ? " (bắt buộc do có cảnh báo)" : " (nếu có)"}`
                  : "Lý do thực hiện"
              }
              id="campaign-action-reason"
              hint="Từ 10 đến 1.000 ký tự khi nhập ghi chú/lý do."
            >
              <textarea
                id="campaign-action-reason"
                className={`${inputStyle} min-h-28`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={10}
                maxLength={1000}
                required={reasonRequired}
              />
            </Field>
          )}
          {confirmBlocked && (
            <p className="text-sm leading-7 text-red-800" role="status">
              {ready
                ? "Chưa thể xác nhận vì dữ liệu còn lỗi chặn. PĐT cần bổ sung dữ liệu hoặc trả về bản nháp."
                : "Cần tải kết quả kiểm tra dữ liệu trước khi xác nhận."}
            </p>
          )}
        </fieldset>
        <Notice message={error} error />
        {conflict && (
          <p className="text-sm leading-7 text-slate-600">
            Trạng thái hoặc dữ liệu có thể đã thay đổi. Dùng nút tải lại bản đã
            lưu ở đầu trang trước khi thử tiếp.
          </p>
        )}
        <button
          className={buttonStyle}
          type="submit"
          disabled={busy || dirty || confirmBlocked || !selected}
        >
          {busy
            ? "Đang xử lý…"
            : selected
              ? actionLabels[selected]
              : "Thực hiện"}
        </button>
      </form>
    </section>
  );
}

function CampaignFacts({ item }: { item: Detail }) {
  const named = item as Detail & {
    facultyName?: string | null;
    departmentName?: string | null;
    selectedSections?: { id: string; code: string; name: string }[];
  };
  const facts = [
    ["Học kỳ", `${item.semesterCode} · ${item.semesterName}`],
    ["Mẫu phiếu", `${item.templateName} · phiên bản ${item.templateVersion}`],
    [
      "Phạm vi",
      `${scopeLabels[item.scope]}${named.facultyName ? ` · ${named.facultyName}` : named.departmentName ? ` · ${named.departmentName}` : ""}`,
    ],
    ["Số lớp trong phạm vi", String(item.sectionCount)],
    ["Bắt đầu · giờ Việt Nam", vietnamTime(item.startsAt)],
    ["Kết thúc · giờ Việt Nam", vietnamTime(item.endsAt)],
    [
      "Ngưỡng công bố",
      `${item.minResponses} phiếu và ${Number((item.minRate * 100).toFixed(2))}% tham gia`,
    ],
    [
      "Ngưỡng cảnh báo cải tiến",
      `${item.warningScore} điểm · thời hạn giải trình ${item.explanationDays} ngày`,
    ],
  ];
  return (
    <section
      aria-labelledby="campaign-facts-title"
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <h2
        id="campaign-facts-title"
        className="text-lg font-bold text-slate-900"
      >
        Thông tin đã lưu
      </h2>
      <dl className="mt-5 grid gap-5 sm:grid-cols-2">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-medium text-slate-500">{label}</dt>
            <dd className="mt-1.5 break-words text-sm leading-7 text-slate-800">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {item.scope === "SECTIONS" && named.selectedSections && (
        <details className="mt-5 border-t border-slate-100 pt-4">
          <summary className="cursor-pointer text-sm font-semibold text-teal-800">
            Các lớp được chọn ({named.selectedSections.length})
          </summary>
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm leading-7 text-slate-600">
            {named.selectedSections.map((section) => (
              <li key={section.id}>
                <strong>{section.code}</strong> · {section.name}
              </li>
            ))}
          </ul>
        </details>
      )}
      {item.mandatory && (
        <p className="mt-4 text-sm font-medium text-teal-800">
          Đợt được đánh dấu cần hoàn thành.
        </p>
      )}
    </section>
  );
}

export function CampaignDetail({
  initial,
  access,
}: {
  initial: Detail;
  access: CampaignCapabilities;
}) {
  const [item, setItem] = useState(initial),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState<string>(),
    [error, setError] = useState<string>();
  const ready = useCampaignResource<{ item: CampaignReadiness }>(
    `/api/campaigns/${item.id}/readiness`,
  );
  const defaults: SurveyDefaults = {
    minResponses: item.minResponses,
    minRate: item.minRate,
    warningScore: item.warningScore,
    explanationDays: item.explanationDays,
    multiTeacherWarningThreshold: 2,
  };
  useEffect(() => {
    if (!["DA_DUYET", "DANG_MO"].includes(item.status)) return;
    let active = true;
    const timer = setInterval(() => {
      void campaignRequest<{ item: Detail }>(`/api/campaigns/${item.id}`)
        .then((data) => {
          if (active)
            setItem((previous) =>
              data.item.revision >= previous.revision ? data.item : previous,
            );
        })
        .catch((problem) => {
          if (active) setError(messageOf(problem));
        });
    }, 30_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [item.id, item.status]);
  async function save(input: CampaignInput) {
    setBusy(true);
    setNotice(undefined);
    setError(undefined);
    try {
      const data = await campaignRequest<{ item: Detail }>(
        `/api/campaigns/${item.id}`,
        {
          ...input,
          expectedRevision: item.revision,
          requestId: crypto.randomUUID(),
        },
      );
      setItem(data.item);
      setDirty(false);
      setNotice("Đã lưu bản nháp.");
      ready.reload();
    } finally {
      setBusy(false);
    }
  }
  async function reload() {
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const data = await campaignRequest<{ item: Detail }>(
        `/api/campaigns/${item.id}`,
      );
      setItem(data.item);
      setDirty(false);
      ready.reload();
    } catch (problem) {
      setError(messageOf(problem));
    } finally {
      setBusy(false);
    }
  }
  const confirmation = item.latestConfirmation;
  return (
    <>
      <Link
        href="/dot-khao-sat"
        className="rounded text-sm font-semibold text-teal-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
      >
        ← Danh sách đợt khảo sát
      </Link>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-3xl font-bold tracking-tight text-slate-950">
            {item.title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Cập nhật {vietnamTime(item.updatedAt)} · giờ Việt Nam
          </p>
        </div>
        <CampaignStatus status={item.status} />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          className={secondaryStyle}
          type="button"
          onClick={() => void reload()}
          disabled={busy}
        >
          Tải lại bản đã lưu{dirty ? " (bỏ thay đổi chưa lưu)" : ""}
        </button>
        <p className="text-xs leading-6 text-slate-500">
          Lịch mở và đóng được kiểm tra lại khi truy cập; màn hình tự cập nhật
          mỗi 30 giây trong thời gian chờ mở hoặc đang mở.
        </p>
      </div>
      <Notice message={notice} />
      <Notice message={error} error />
      {item.semesterLocked && (
        <Notice message="Học kỳ đã khóa sổ. Các thao tác thay đổi dữ liệu bị giới hạn theo trạng thái học kỳ." />
      )}
      {item.dataDriftDetected && (
        <Notice message="Dữ liệu đã thay đổi sau lần xác nhận. Danh sách được chốt theo dữ liệu tại lúc mở và thông báo đã được tạo cho PĐT, ĐBCL." />
      )}
      <div className="mt-6 space-y-6">
        {access.write && item.status === "NHAP" && !item.semesterLocked ? (
          <CampaignForm
            key={`edit:${item.id}:${item.revision}`}
            initial={item}
            defaults={defaults}
            busy={busy}
            onSave={save}
            onDirtyChange={setDirty}
          />
        ) : (
          <CampaignFacts item={item} />
        )}
        <CampaignReadinessPanel
          item={ready.data?.item}
          loading={ready.loading}
          error={ready.error}
          reload={ready.reload}
        />
        {confirmation && (
          <section
            aria-labelledby="campaign-confirmation-title"
            className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
          >
            <h2
              id="campaign-confirmation-title"
              className="text-lg font-bold text-slate-900"
            >
              Bản chụp xác nhận gần nhất
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {confirmation.status === "DA_XAC_NHAN"
                ? "Đã xác nhận dữ liệu"
                : "Đã trả về bản nháp"}{" "}
              · {vietnamTime(confirmation.occurredAt)}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Người thực hiện: {confirmation.confirmedByName}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {confirmation.sectionCount} lớp · {confirmation.pairCount} cặp
              sinh viên – lớp · {confirmation.warnings.length} cảnh báo
            </p>
            {confirmation.reason && (
              <p className="mt-3 break-words whitespace-pre-wrap text-sm leading-7 text-slate-600">
                Ghi chú: {confirmation.reason}
              </p>
            )}
            <details className="mt-4 text-xs text-slate-500">
              <summary className="cursor-pointer font-semibold text-teal-800">
                Dấu kiểm tra bản chụp dữ liệu
              </summary>
              <p className="mt-2 break-all font-mono">
                {confirmation.snapshotHash}
              </p>
            </details>
          </section>
        )}
        <ActionPanel
          key={`actions:${item.id}:${item.revision}`}
          item={item}
          access={access}
          dirty={dirty || busy}
          ready={ready.data?.item}
          onSuccess={(next) => {
            setItem(next);
            setDirty(false);
            setNotice("Đã cập nhật đợt khảo sát.");
            setError(undefined);
            ready.reload();
          }}
        />
        {access.progress &&
          [
            "DANG_MO",
            "DA_DONG",
            "DA_TONG_HOP",
            "DA_CONG_BO",
            "LUU_TRU",
          ].includes(item.status) && (
            <CampaignProgress key={`progress:${item.revision}`} id={item.id} />
          )}
        <section
          aria-labelledby="campaign-history-title"
          className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
        >
          <h2
            id="campaign-history-title"
            className="text-lg font-bold text-slate-900"
          >
            Lịch sử gần đây
          </h2>
          <ol className="mt-5 space-y-4">
            {item.history.map((event) => (
              <li key={event.id} className="border-l-2 border-teal-200 pl-4">
                <p className="text-sm font-semibold text-slate-800">
                  {event.action &&
                  actionLabels[event.action.toLowerCase() as CampaignAction]
                    ? actionLabels[event.action.toLowerCase() as CampaignAction]
                    : `${statusLabels[event.fromStatus]} → ${statusLabels[event.toStatus]}`}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {vietnamTime(event.occurredAt)} ·{" "}
                  {event.actorName ?? "Hệ thống"}
                </p>
                {event.reason && (
                  <p className="mt-2 break-words whitespace-pre-wrap text-sm leading-7 text-slate-600">
                    {event.reason}
                  </p>
                )}
              </li>
            ))}
          </ol>
          {!item.history.length && (
            <p className="mt-4 text-sm text-slate-500">
              Chưa có lịch sử chuyển trạng thái.
            </p>
          )}
        </section>
      </div>
    </>
  );
}

export function NewCampaign() {
  const router = useRouter();
  const settings = useCampaignResource<{ item: SurveyDefaults }>(
    "/api/survey-settings",
  );
  const [busy, setBusy] = useState(false);
  async function save(input: CampaignInput) {
    setBusy(true);
    try {
      const data = await campaignRequest<{ item: Detail }>(
        "/api/campaigns",
        input,
      );
      router.replace(`/dot-khao-sat/${data.item.id}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link
        href="/dot-khao-sat"
        className="rounded text-sm font-semibold text-teal-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
      >
        ← Danh sách đợt khảo sát
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950">
        Tạo đợt khảo sát
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
        Lưu bản nháp, trình PĐT xác nhận dữ liệu rồi trình lãnh đạo phê duyệt.
        Hệ thống chốt đối tượng khảo sát khi đợt bắt đầu.
      </p>
      <Notice message={settings.error} error />
      {settings.error && (
        <button
          type="button"
          className={secondaryStyle}
          onClick={settings.reload}
        >
          Tải lại cấu hình
        </button>
      )}
      {settings.loading && (
        <p className="mt-6 text-sm text-slate-500" role="status">
          Đang tải cấu hình mặc định…
        </p>
      )}
      {settings.data && (
        <div className="mt-7">
          <CampaignForm
            defaults={settings.data.item}
            busy={busy}
            onSave={save}
          />
        </div>
      )}
    </>
  );
}
