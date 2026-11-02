"use client";
import { useRef, useState } from "react";
import { feedbackRequest, feedbackError } from "../feedback/feedback-client";
export function useWorkflowMutation() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string>(),
    [message, setMessage] = useState<string>();
  const active = useRef(false),
    attempt = useRef<{ signature: string; id: string } | null>(null);
  async function submit<T>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T | undefined> {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    const signature = JSON.stringify([path, body]);
    if (attempt.current?.signature !== signature)
      attempt.current = { signature, id: crypto.randomUUID() };
    try {
      const result = await feedbackRequest<T>(path, {
        ...body,
        requestId: attempt.current.id,
      });
      attempt.current = null;
      setMessage("Đã lưu thay đổi.");
      return result;
    } catch (cause) {
      setError(feedbackError(cause));
      return undefined;
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  return { busy, error, message, submit };
}
