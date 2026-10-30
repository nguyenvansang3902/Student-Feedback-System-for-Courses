import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  MAX_SURVEY_RESULTS_BODY_BYTES,
  readSurveyResultsBody,
} from "../src/server/auth/survey-results-body";

const request = (body: string, type = "application/json", length?: string) =>
  new NextRequest("http://localhost/api/survey-results/campaign/publish", {
    method: "POST",
    body,
    headers: {
      "Content-Type": type,
      ...(length ? { "Content-Length": length } : {}),
    },
  });

describe("W9 BR-03/09/30 — biên body thao tác kết quả", () => {
  it("nhận JSON tiếng Việt; sai kiểu hoặc JSON hỏng không phản chiếu nội dung riêng tư", async () => {
    await expect(
      readSurveyResultsBody(
        request(
          '{"reason":"Nội dung phù hợp"}',
          "Application/JSON; charset=utf-8",
        ),
      ),
    ).resolves.toEqual({ reason: "Nội dung phù hợp" });
    await expect(
      readSurveyResultsBody(request("PRIVATE_TEXT{", "text/plain")),
    ).rejects.toMatchObject({ status: 415 });
    await expect(
      readSurveyResultsBody(request("PRIVATE_TEXT{")),
    ).rejects.toMatchObject({
      status: 400,
      message: "Dữ liệu yêu cầu không hợp lệ.",
    });
  });
  it("chặn byte thực kể cả Content-Length thiếu hoặc giả nhỏ; hủy stream lỗi vẫn trả 413", async () => {
    const body = JSON.stringify({
      reason: "đ".repeat(MAX_SURVEY_RESULTS_BODY_BYTES),
    });
    for (const length of [undefined, "2"])
      await expect(
        readSurveyResultsBody(request(body, "application/json", length)),
      ).rejects.toMatchObject({ status: 413 });
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_SURVEY_RESULTS_BODY_BYTES + 1));
      },
      cancel() {
        throw new Error("PRIVATE_TEXT");
      },
    });
    await expect(
      readSurveyResultsBody({
        headers: new Headers({ "Content-Type": "application/json" }),
        body: stream,
      } as NextRequest),
    ).rejects.toMatchObject({ status: 413 });
  });
  it("từ chối UTF-8 hỏng, thiếu body và Content-Length không hợp lệ", async () => {
    const invalid = new Uint8Array([123, 34, 120, 34, 58, 34, 0xff, 34, 125]);
    await expect(
      readSurveyResultsBody(
        new NextRequest("http://localhost", {
          method: "POST",
          body: invalid,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      readSurveyResultsBody(
        new NextRequest("http://localhost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ).rejects.toMatchObject({ status: 400 });
    for (const length of [
      "-1",
      "NaN",
      String(MAX_SURVEY_RESULTS_BODY_BYTES + 1),
    ])
      await expect(
        readSurveyResultsBody(request("{}", "application/json", length)),
      ).rejects.toMatchObject({ status: 413 });
  });
});
