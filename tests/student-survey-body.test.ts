import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  MAX_STUDENT_SURVEY_BODY_BYTES,
  readStudentSurveyBody,
} from "../src/server/auth/student-survey-body";
const request = (body: string, type = "application/json", length?: string) =>
  new NextRequest("http://localhost/api/student-surveys/task/submit", {
    method: "POST",
    body,
    headers: {
      "Content-Type": type,
      ...(length ? { "Content-Length": length } : {}),
    },
  });
describe("W8 BR-03/04 — body phiếu có giới hạn và lỗi không lộ giá trị", () => {
  it("đọc JSON và Content-Type không phân biệt hoa thường", async () => {
    const data = {
      answers: [{ questionId: "q", valueText: "Góp ý tiếng Việt" }],
    };
    await expect(
      readStudentSurveyBody(
        request(JSON.stringify(data), "Application/JSON; charset=utf-8"),
      ),
    ).resolves.toEqual(data);
  });
  it("từ chối JSON hỏng, thiếu body và kiểu khác, không nhắc lại chuỗi nhạy cảm", async () => {
    await expect(
      readStudentSurveyBody(request("PRIVATE_MARKER{", "text/plain")),
    ).rejects.toMatchObject({ status: 415 });
    await expect(
      readStudentSurveyBody(request("PRIVATE_MARKER{")),
    ).rejects.toMatchObject({
      status: 400,
      message: "Dữ liệu phiếu khảo sát không hợp lệ.",
    });
    await expect(
      readStudentSurveyBody(
        new NextRequest("http://localhost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("BR-04 chặn byte thực khi thiếu hoặc giả Content-Length", async () => {
    const body = JSON.stringify({
      answers: [{ valueText: "đ".repeat(MAX_STUDENT_SURVEY_BODY_BYTES) }],
    });
    for (const length of [undefined, "2"])
      await expect(
        readStudentSurveyBody(request(body, "application/json", length)),
      ).rejects.toMatchObject({ status: 413 });
  });
  it("chặn Content-Length sai hoặc quá lớn trước khi đọc", async () => {
    for (const length of [
      String(MAX_STUDENT_SURVEY_BODY_BYTES + 1),
      "-1",
      "NaN",
    ])
      await expect(
        readStudentSurveyBody(request("{}", "application/json", length)),
      ).rejects.toMatchObject({ status: 413 });
  });
  it("từ chối UTF-8 hỏng và stream lỗi bằng thông báo chung", async () => {
    const body = new Uint8Array([123, 34, 120, 34, 58, 34, 0xff, 34, 125]);
    await expect(
      readStudentSurveyBody(
        new NextRequest("http://localhost", {
          method: "POST",
          body,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ).rejects.toMatchObject({
      status: 400,
      message: "Dữ liệu phiếu khảo sát không hợp lệ.",
    });
    const stream = new ReadableStream({
      start(controller) {
        controller.error(new Error("PRIVATE_MARKER"));
      },
    });
    const broken = {
      headers: new Headers({ "Content-Type": "application/json" }),
      body: stream,
    } as unknown as NextRequest;
    await expect(readStudentSurveyBody(broken)).rejects.toMatchObject({
      status: 400,
      message: "Dữ liệu phiếu khảo sát không hợp lệ.",
    });
  });
  it("vẫn trả 413 nếu hủy stream quá giới hạn gặp lỗi", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_STUDENT_SURVEY_BODY_BYTES + 1));
      },
      cancel() {
        throw new Error("PRIVATE_MARKER");
      },
    });
    const oversized = {
      headers: new Headers({ "Content-Type": "application/json" }),
      body: stream,
    } as unknown as NextRequest;
    await expect(readStudentSurveyBody(oversized)).rejects.toMatchObject({
      status: 413,
    });
  });
});
