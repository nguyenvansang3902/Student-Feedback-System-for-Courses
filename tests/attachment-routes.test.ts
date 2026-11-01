import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthActor } from "../src/server/auth/types";
import { issueFeedbackCsrf } from "../src/server/auth/csrf";
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_REQUEST_BYTES,
} from "../src/server/feedback/attachment-files";
import { POST } from "../src/app/api/feedback/[id]/attachments/route";
import { GET } from "../src/app/api/feedback/[id]/attachments/[attachmentId]/route";

const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  upload: vi.fn(),
  download: vi.fn(),
}));
vi.mock("../src/lib/env", () => ({
  getAuthConfig: () => ({
    appUrl: "http://localhost:3000",
    jwtSecret: "f".repeat(64),
    trustProxy: false,
  }),
}));
vi.mock("../src/server/services/auth", () => ({ getActor: mocks.actor }));
vi.mock("../src/server/services/feedback-attachments", () => ({
  uploadFeedbackAttachments: mocks.upload,
  downloadFeedbackAttachment: mocks.download,
}));
const actor: AuthActor = {
  userId: randomUUID(),
  sessionId: randomUUID(),
  familyId: randomUUID(),
  loginCode: "SV_FAKE",
  email: "student@example.invalid",
  displayName: "Sinh viên giả",
  roles: ["SINH_VIEN"],
  assignments: [
    {
      role: "SINH_VIEN",
      scopeType: "GLOBAL",
      facultyId: null,
      departmentId: null,
    },
  ],
  purpose: "FULL",
  mfa: false,
  mustChangePassword: false,
};
const id = randomUUID(),
  attachmentId = randomUUID();
const uploadContext = () => ({ params: Promise.resolve({ id }) });
const downloadContext = () => ({
  params: Promise.resolve({ id, attachmentId }),
});
function form() {
  const value = new FormData();
  value.append(
    "files",
    new File(["%PDF-1.7\n%%EOF\n"], "evidence.pdf", {
      type: "application/pdf",
    }),
  );
  return value;
}
function request(
  body: BodyInit = form(),
  extra: Record<string, string> = {},
  query = "",
) {
  return new NextRequest(
    `http://localhost:3000/api/feedback/${id}/attachments${query}`,
    {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
        cookie: "sfs_access=fixture",
        "x-csrf-token": issueFeedbackCsrf(actor),
        ...extra,
      },
      body,
    },
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.actor.mockResolvedValue(actor);
  mocks.upload.mockResolvedValue([
    { id: attachmentId, displayName: "tep-dinh-kem.pdf" },
  ]);
  mocks.download.mockResolvedValue({
    content: Buffer.from("fixture"),
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="tep-dinh-kem.pdf"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

describe("FR-70 BR-28/34 — upload/download HTTP có kiểm Origin/CSRF và giới hạn stream", () => {
  it("chặn khách, Origin và CSRF hỏng trước khi đọc body hoặc gọi upload", async () => {
    const guest = request();
    const read = vi.spyOn(guest.body!, "getReader");
    mocks.actor.mockResolvedValueOnce(null);
    expect((await POST(guest, uploadContext())).status).toBe(401);
    expect(read).not.toHaveBeenCalled();
    const handlerRequest = request();
    const handlerRead = vi.spyOn(handlerRequest.body!, "getReader");
    mocks.actor.mockResolvedValueOnce({
      ...actor,
      roles: ["GIANG_VIEN"],
      assignments: [
        {
          role: "GIANG_VIEN",
          scopeType: "GLOBAL",
          facultyId: null,
          departmentId: null,
        },
      ],
    });
    expect((await POST(handlerRequest, uploadContext())).status).toBe(403);
    expect(handlerRead).not.toHaveBeenCalled();
    expect(
      (
        await POST(
          request(form(), { origin: "https://example.invalid" }),
          uploadContext(),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await POST(
          request(form(), { "x-csrf-token": "invalid" }),
          uploadContext(),
        )
      ).status,
    ).toBe(403);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("nhận multipart files và trả201 qua service có actor/feedbackId", async () => {
    const response = await POST(request(), uploadContext());
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      ok: true,
      attachments: [{ id: attachmentId }],
    });
    expect(mocks.upload).toHaveBeenCalledWith(actor, id, [
      expect.objectContaining({
        name: "evidence.pdf",
        content: expect.any(Buffer),
      }),
    ]);
  });
  it("không nhận query phụ, trường lạ, field text hoặc quá3tệp", async () => {
    expect(
      (await POST(request(form(), {}, "?userId=other"), uploadContext()))
        .status,
    ).toBe(400);
    const unknown = form();
    unknown.append("feedbackId", randomUUID());
    const text = new FormData();
    text.append("files", "not-a-file");
    const excess = form();
    for (let index = 0; index < 3; index++)
      excess.append("files", new File(["fixture"], `${index}.pdf`));
    for (const body of [unknown, text, excess])
      expect((await POST(request(body), uploadContext())).status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("chặn Content-Length vượt giới hạn và stream lớn không khai Content-Length", async () => {
    expect(
      (
        await POST(
          request(form(), {
            "content-length": String(MAX_ATTACHMENT_REQUEST_BYTES + 1),
          }),
          uploadContext(),
        )
      ).status,
    ).toBe(413);
    const body = new Uint8Array(MAX_ATTACHMENT_REQUEST_BYTES + 1);
    expect(
      (
        await POST(
          request(body, {
            "content-type": "multipart/form-data; boundary=fixture",
          }),
          uploadContext(),
        )
      ).status,
    ).toBe(413);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("chặn từng tệp hơn5MiB và multipart hỏng", async () => {
    const large = new FormData();
    large.append(
      "files",
      new File([new Uint8Array(MAX_ATTACHMENT_BYTES + 1)], "large.pdf"),
    );
    expect((await POST(request(large), uploadContext())).status).toBe(413);
    expect(
      (
        await POST(
          request("broken", {
            "content-type": "multipart/form-data; boundary=fixture",
          }),
          uploadContext(),
        )
      ).status,
    ).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("GET dùng service kiểm quyền và trả header tải xuống; query/khách bị chặn", async () => {
    const req = (query = "") =>
      new NextRequest(
        `http://localhost:3000/api/feedback/${id}/attachments/${attachmentId}${query}`,
        { headers: { cookie: "sfs_access=fixture" } },
      );
    const response = await GET(req(), downloadContext());
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("fixture");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="tep-dinh-kem.pdf"',
    );
    expect(mocks.download).toHaveBeenCalledExactlyOnceWith(
      actor,
      id,
      attachmentId,
    );
    expect(
      (await GET(req("?filename=private"), downloadContext())).status,
    ).toBe(400);
    mocks.actor.mockResolvedValueOnce(null);
    expect((await GET(req(), downloadContext())).status).toBe(401);
    expect(mocks.download).toHaveBeenCalledTimes(1);
  });
});
