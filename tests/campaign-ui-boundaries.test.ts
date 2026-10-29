import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  MAX_CAMPAIGN_BODY_BYTES,
  readCampaignBody,
} from "../src/server/auth/campaign-body";
import { vietnamInput, vietnamIso } from "../src/components/campaigns/types";

const request = (body: string, type = "application/json", length?: string) =>
  new NextRequest("http://localhost/api/campaigns", {
    method: "POST",
    body,
    headers: {
      "Content-Type": type,
      ...(length ? { "Content-Length": length } : {}),
    },
  });
afterEach(() => vi.unstubAllEnvs());

describe("W7 FR-40/BR-30 — ranh giới body đợt khảo sát", () => {
  it("đọc đúng JSON tiếng Việt và từ chối loại nội dung/JSON hỏng", async () => {
    const input = { title: "Khảo sát môn học", sectionIds: [] };
    await expect(
      readCampaignBody(request(JSON.stringify(input))),
    ).resolves.toEqual(input);
    await expect(
      readCampaignBody(
        request(JSON.stringify(input), "Application/JSON; charset=utf-8"),
      ),
    ).resolves.toEqual(input);
    await expect(
      readCampaignBody(request("{}", "text/plain")),
    ).rejects.toMatchObject({ status: 415 });
    await expect(readCampaignBody(request("{"))).rejects.toMatchObject({
      status: 400,
    });
  });
  it("giới hạn byte thực khi không khai báo hoặc giả Content-Length", async () => {
    const body = JSON.stringify({ title: "đ".repeat(MAX_CAMPAIGN_BODY_BYTES) });
    await expect(readCampaignBody(request(body))).rejects.toMatchObject({
      status: 413,
    });
    await expect(
      readCampaignBody(request(body, "application/json", "2")),
    ).rejects.toMatchObject({ status: 413 });
  });
  it("từ chối Content-Length âm, không phải số hoặc vượt giới hạn trước khi đọc", async () => {
    for (const length of ["-1", "invalid", String(MAX_CAMPAIGN_BODY_BYTES + 1)])
      await expect(
        readCampaignBody(request("{}", "application/json", length)),
      ).rejects.toMatchObject({ status: 413 });
  });
});

describe("W7 FR-40/44 — thời gian nhập cố định theo giờ Việt Nam", () => {
  it.each(["UTC", "America/Los_Angeles", "Asia/Ho_Chi_Minh"])(
    "không đổi mốc khảo sát theo timezone trình duyệt/máy: %s",
    (timezone) => {
      vi.stubEnv("TZ", timezone);
      expect(vietnamInput("2026-10-28T19:45:00.000Z")).toBe("2026-10-29T02:45");
      expect(vietnamIso("2026-10-29T00:15")).toBe("2026-10-28T17:15:00.000Z");
      expect(vietnamInput(vietnamIso("2026-10-29T20:30"))).toBe(
        "2026-10-29T20:30",
      );
    },
  );
  it("từ chối ngày/giờ không tồn tại thay vì để Date tự chuyển sang tháng sau", () => {
    for (const value of [
      "2026-02-29T12:00",
      "2026-02-30T12:00",
      "2026-10-29T24:00",
      "2026-10-29T12:60",
      "2026-10-29T12:00Z",
      "not a date",
    ])
      expect(() => vietnamIso(value)).toThrow();
    expect(vietnamIso("2028-02-29T12:00")).toBe("2028-02-29T05:00:00.000Z");
  });
});
