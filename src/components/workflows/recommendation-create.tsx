"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type {
  RecommendationDetail,
  RecommendationOptions,
} from "@/server/services/improvement-types";
import { useFeedbackResource } from "../feedback/feedback-client";
import { useClientReady } from "../auth/use-client-ready";
import {
  buttonStyle,
  Field,
  inputStyle,
  Notice,
  secondaryStyle,
} from "../admin/ui";
import { useWorkflowMutation } from "./workflow-client";
export function RecommendationCreatePanel() {
  const ready = useClientReady(),
    router = useRouter(),
    resource = useFeedbackResource<RecommendationOptions>(
      "/api/exam-recommendations/options",
    ),
    mutation = useWorkflowMutation(),
    [campaignId, setCampaignId] = useState(""),
    [courseId, setCourseId] = useState("");
  const campaign = resource.data?.campaigns.find((c) => c.id === campaignId),
    course = campaign?.courses.find((c) => c.id === courseId);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    const data = new FormData(event.currentTarget);
    const result = await mutation.submit<{ item: RecommendationDetail }>(
      "/api/exam-recommendations",
      {
        campaignId,
        courseId,
        recipientId: String(data.get("recipientId") ?? ""),
        body: String(data.get("body") ?? ""),
      },
    );
    if (result) router.push(`/kien-nghi/${result.item.id}`);
  }
  return (
    <>
      <Link
        href="/kien-nghi"
        className="text-sm font-semibold text-teal-800 underline"
      >
        Danh sách kiến nghị
      </Link>
      <h1 className="mt-6 text-3xl font-bold text-slate-950">
        Gửi kiến nghị rà soát
      </h1>
      <Notice error message={resource.error || mutation.error} />
      {resource.loading && (
        <p role="status" className="py-8">
          Đang tải đợt và môn học…
        </p>
      )}
      {resource.data && !resource.data.campaigns.length && (
        <Notice message="Chưa có môn học trong đợt đã công bố đủ dữ liệu gộp và có trưởng bộ môn nhận kiến nghị." />
      )}
      {resource.data && resource.data.campaigns.length > 0 && (
        <form
          method="post"
          onSubmit={submit}
          className="mt-6 max-w-3xl space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"
        >
          <Field label="Đợt khảo sát đã công bố" id="recommendation-campaign">
            <select
              id="recommendation-campaign"
              name="campaignId"
              value={campaignId}
              required
              disabled={!ready || mutation.busy}
              className={inputStyle}
              onChange={(event) => {
                setCampaignId(event.target.value);
                setCourseId("");
              }}
            >
              <option value="">Chọn đợt khảo sát</option>
              {resource.data.campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Môn học" id="recommendation-course">
            <select
              id="recommendation-course"
              name="courseId"
              value={courseId}
              required
              disabled={!ready || mutation.busy || !campaign}
              className={inputStyle}
              onChange={(event) => setCourseId(event.target.value)}
            >
              <option value="">Chọn môn học</option>
              {campaign?.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Trưởng bộ môn nhận kiến nghị"
            id="recommendation-recipient"
          >
            <select
              key={`${campaignId}:${courseId}`}
              id="recommendation-recipient"
              name="recipientId"
              required
              disabled={!ready || mutation.busy || !course}
              className={inputStyle}
              defaultValue=""
            >
              <option value="">Chọn người nhận</option>
              {course?.recipients.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.displayName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nội dung kiến nghị" id="recommendation-body">
            <textarea
              id="recommendation-body"
              name="body"
              className={`${inputStyle} min-h-48`}
              required
              minLength={20}
              maxLength={10000}
              disabled={!ready || mutation.busy}
            />
          </Field>
          <div className="flex flex-wrap gap-3">
            <button
              className={buttonStyle}
              disabled={!ready || mutation.busy || !course}
            >
              {mutation.busy ? "Đang gửi…" : "Gửi kiến nghị"}
            </button>
            <Link href="/kien-nghi" className={secondaryStyle}>
              Quay lại
            </Link>
          </div>
        </form>
      )}
    </>
  );
}
