"use client";
import { Notice, secondaryStyle } from "../admin/ui";
import { useFeedbackResource } from "./feedback-client";
import { Panel, statusLabels } from "./labels";
import { inspectionConclusionLabels } from "./inspection-workflow-panel";
export function InspectionStudentResult({
  feedbackId,
}: {
  feedbackId: string;
}) {
  const resource = useFeedbackResource<{
    item: { status: string; conclusion: string | null; summary: string | null };
  }>(`/api/feedback/${feedbackId}/inspection-result`);
  return (
    <div className="my-6">
      <Panel title="Kết quả xử lý hồ sơ">
        <Notice error message={resource.error} />
        {resource.loading && (
          <p role="status" className="text-sm text-slate-600">
            Đang tải kết quả…
          </p>
        )}
        {resource.data && (
          <>
            <p className="text-sm font-semibold">
              {statusLabels[resource.data.item.status] ??
                resource.data.item.status}
            </p>
            {resource.data.item.conclusion && (
              <p className="mt-3 text-sm">
                Kết luận:{" "}
                {inspectionConclusionLabels[resource.data.item.conclusion] ??
                  resource.data.item.conclusion}
              </p>
            )}
            {resource.data.item.summary ? (
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">
                {resource.data.item.summary}
              </p>
            ) : (
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Kết quả sẽ hiển thị sau khi Thanh tra hoàn tất bước thông báo.
              </p>
            )}
          </>
        )}
        <button
          type="button"
          className={`${secondaryStyle} mt-4`}
          disabled={resource.loading}
          onClick={resource.reload}
        >
          Tải lại kết quả
        </button>
      </Panel>
    </div>
  );
}
