import { describe, expect, it, vi } from "vitest";
import type {
  StudentSurveyQuestion,
  StudentSurveyTemplate,
} from "../src/server/services/student-survey-types";
import {
  clearAllSurveyDrafts,
  clearTaskSurveyDrafts,
  isSurveyAnswerFilled,
  loadSurveyDraft,
  MAX_DRAFT_AGE_MS,
  parseDraftAnswers,
  parseSurveyDraftEvent,
  saveSurveyDraft,
  SURVEY_DRAFT_PREFIX,
  SURVEY_DRAFT_EVENT_KEY,
  subscribeSurveyDraftEvents,
  surveyDraftKey,
  type DraftContext,
  type DraftStorage,
} from "../src/components/student-surveys/survey-draft";

class MemoryStorage implements DraftStorage {
  data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}
const question = (
  type: StudentSurveyQuestion["type"],
  patch: Partial<StudentSurveyQuestion> = {},
): StudentSurveyQuestion => ({
  id: type,
  label: type,
  type,
  position: 1,
  required: true,
  allowNA: true,
  scaleMin: type === "LIKERT" ? 1 : null,
  scaleMax: type === "LIKERT" ? 5 : null,
  options: type.endsWith("CHOICE")
    ? [
        { id: "a", label: "A", position: 1 },
        { id: "b", label: "B", position: 2 },
      ]
    : [],
  ...patch,
});
const template: StudentSurveyTemplate = {
  id: "template",
  familyId: "family",
  version: 1,
  name: "Mẫu",
  groups: [
    {
      id: "g",
      title: "Nhóm",
      position: 1,
      questions: [
        question("LIKERT"),
        question("TEXT"),
        question("BOOLEAN"),
        question("SINGLE_CHOICE"),
        question("MULTIPLE_CHOICE"),
      ],
    },
  ],
};
const now = Date.parse("2026-10-29T00:00:00Z");
const context: DraftContext = {
  userId: "student-a",
  taskId: "task-a",
  template,
  endsAt: "2026-12-01T00:00:00Z",
};
describe("W8 FR-52 BR-03/04 — nháp chỉ ở trình duyệt", () => {
  it("phục hồi đúng năm kiểu; boolean false là câu đã trả lời", () => {
    const storage = new MemoryStorage();
    const answers = {
      LIKERT: { questionId: "LIKERT", valueNumber: 4 },
      TEXT: { questionId: "TEXT", valueText: "Góp ý" },
      BOOLEAN: { questionId: "BOOLEAN", valueBoolean: false },
      SINGLE_CHOICE: { questionId: "SINGLE_CHOICE", valueOptionIds: ["a"] },
      MULTIPLE_CHOICE: {
        questionId: "MULTIPLE_CHOICE",
        valueOptionIds: ["a", "b"],
      },
    };
    expect(saveSurveyDraft(context, answers, storage, now)).toBe(true);
    expect(loadSurveyDraft(context, storage, now + 1000)).toEqual({
      state: "restored",
      answers,
    });
    for (const q of template.groups[0].questions)
      expect(
        isSurveyAnswerFilled(q, answers[q.id as keyof typeof answers]),
      ).toBe(true);
    expect(storage.getItem(surveyDraftKey(context))).not.toMatch(
      /token|session|responseId|answerId|student-a|task-a/,
    );
  });
  it("không phục hồi nháp tài khoản, nhiệm vụ hoặc phiên bản khác; bỏ phiên bản cũ", () => {
    const storage = new MemoryStorage();
    saveSurveyDraft(
      context,
      { BOOLEAN: { questionId: "BOOLEAN", valueBoolean: false } },
      storage,
      now,
    );
    expect(
      loadSurveyDraft({ ...context, userId: "student-b" }, storage, now).state,
    ).toBe("empty");
    expect(
      loadSurveyDraft({ ...context, taskId: "task-b" }, storage, now).state,
    ).toBe("empty");
    expect(
      loadSurveyDraft(
        { ...context, template: { ...template, version: 2 } },
        storage,
        now,
      ).state,
    ).toBe("empty");
    expect(storage.getItem(surveyDraftKey(context))).toBeNull();
  });
  it("BR-04 Không áp dụng là giá trị riêng, chỉ nhận nếu câu cho phép", () => {
    expect(
      parseDraftAnswers(
        [{ questionId: "LIKERT", isNotApplicable: true }],
        template,
      ),
    ).toEqual({ LIKERT: { questionId: "LIKERT", isNotApplicable: true } });
    expect(
      parseDraftAnswers(
        [{ questionId: "LIKERT", isNotApplicable: true, valueNumber: 3 }],
        template,
      ),
    ).toBeNull();
    const disallowed = {
      ...template,
      groups: [
        {
          ...template.groups[0],
          questions: [question("LIKERT", { allowNA: false })],
        },
      ],
    };
    expect(
      parseDraftAnswers(
        [{ questionId: "LIKERT", isNotApplicable: true }],
        disallowed,
      ),
    ).toBeNull();
  });
  it("loại bỏ trường lạ, câu lạ/trùng, sai loại, option lạ/trùng, ngoài thang và tự luận quá dài", () => {
    const invalid = [
      [{ questionId: "TEXT", valueText: "x", responseId: "private" }],
      [{ questionId: "unknown" }],
      [{ questionId: "BOOLEAN" }, { questionId: "BOOLEAN" }],
      [{ questionId: "BOOLEAN", valueBoolean: "false" }],
      [{ questionId: "SINGLE_CHOICE", valueOptionIds: ["a", "b"] }],
      [{ questionId: "MULTIPLE_CHOICE", valueOptionIds: ["a", "a"] }],
      [{ questionId: "SINGLE_CHOICE", valueOptionIds: ["outside"] }],
      [{ questionId: "LIKERT", valueNumber: 6 }],
      [{ questionId: "TEXT", valueText: "x".repeat(4001) }],
      [{ questionId: "TEXT", valueText: "x\u0000" }],
    ];
    for (const value of invalid)
      expect(parseDraftAnswers(value, template)).toBeNull();
  });
  it("xóa nháp hết 7 ngày, hỏng, hoặc timestamp tương lai", () => {
    for (const sample of [
      "{",
      JSON.stringify({ savedAt: now, answers: [], token: "secret" }),
      JSON.stringify({ savedAt: now + 120_000, answers: [] }),
      "x".repeat(262_145),
    ]) {
      const storage = new MemoryStorage();
      storage.setItem(surveyDraftKey(context), sample);
      expect(["invalid", "expired"]).toContain(
        loadSurveyDraft(context, storage, now).state,
      );
      expect(storage.length).toBe(0);
    }
    for (const [next, clock] of [
      [context, now + MAX_DRAFT_AGE_MS + 1],
    ] as const) {
      const storage = new MemoryStorage();
      saveSurveyDraft(context, {}, storage, now);
      expect(loadSurveyDraft(next, storage, clock).state).toBe("expired");
      expect(storage.length).toBe(0);
    }
  });
  it("giữ nháp khi hạn cũ đã qua để máy chủ xác nhận gia hạn hoặc đóng đợt", () => {
    const storage = new MemoryStorage();
    const oldSchedule = {
      ...context,
      endsAt: new Date(now - 1000).toISOString(),
    };
    const answers = { BOOLEAN: { questionId: "BOOLEAN", valueBoolean: false } };
    expect(saveSurveyDraft(oldSchedule, answers, storage, now)).toBe(true);
    expect(loadSurveyDraft(oldSchedule, storage, now + 1000)).toEqual({
      state: "restored",
      answers,
    });
    clearTaskSurveyDrafts(oldSchedule, storage);
    expect(loadSurveyDraft(oldSchedule, storage, now + 1000).state).toBe(
      "empty",
    );
  });
  it("giới hạn 20 nháp; clear DONE theo task và logout chỉ xóa namespace khảo sát", () => {
    const storage = new MemoryStorage();
    storage.setItem("unrelated", "keep");
    for (let n = 0; n < 25; n++)
      saveSurveyDraft({ ...context, taskId: `task-${n}` }, {}, storage, now);
    expect(
      [...storage.data.keys()].filter((key) =>
        key.startsWith(SURVEY_DRAFT_PREFIX),
      ),
    ).toHaveLength(20);
    clearTaskSurveyDrafts({ ...context, taskId: "task-24" }, storage);
    expect(
      loadSurveyDraft({ ...context, taskId: "task-24" }, storage, now).state,
    ).toBe("empty");
    expect(clearAllSurveyDrafts(storage)).toBe(true);
    expect([...storage.data]).toEqual([["unrelated", "keep"]]);
  });
  it("trình duyệt chặn storage không làm hỏng form hay đăng xuất", () => {
    const blocked: DraftStorage = {
      get length(): number {
        throw new Error("blocked");
      },
      key() {
        throw new Error("blocked");
      },
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
      removeItem() {
        throw new Error("blocked");
      },
    };
    expect(loadSurveyDraft(context, blocked, now).state).toBe("unavailable");
    expect(saveSurveyDraft(context, {}, blocked, now)).toBe(false);
    expect(clearAllSurveyDrafts(blocked)).toBe(false);
    expect(clearTaskSurveyDrafts(context, blocked)).toBe(false);
  });
  it("truyền metadata xóa nháp tới tab/form, không giữ sự kiện hay nội dung phiếu trong storage", () => {
    const surface = new EventTarget();
    vi.stubGlobal("window", surface);
    try {
      const events: unknown[] = [];
      const unsubscribe = subscribeSurveyDraftEvents((event) =>
        events.push(event),
      );
      const storage = new MemoryStorage();
      saveSurveyDraft(
        context,
        { TEXT: { questionId: "TEXT", valueText: "PRIVATE_MARKER" } },
        storage,
        now,
      );
      clearTaskSurveyDrafts(context, storage);
      clearAllSurveyDrafts(storage);
      expect(events).toEqual([
        {
          kind: "task-cleared",
          userId: context.userId,
          taskId: context.taskId,
        },
        { kind: "logout" },
      ]);
      expect(storage.getItem(SURVEY_DRAFT_EVENT_KEY)).toBeNull();
      expect(storage.length).toBe(0);
      expect(JSON.stringify(events)).not.toContain("PRIVATE_MARKER");
      unsubscribe();
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("không nhận sự kiện hỏng hoặc mang thêm đáp án/token", () => {
    expect(parseSurveyDraftEvent("{")).toBeNull();
    expect(
      parseSurveyDraftEvent(
        JSON.stringify({ kind: "logout", nonce: "1", token: "secret" }),
      ),
    ).toBeNull();
    expect(
      parseSurveyDraftEvent(
        JSON.stringify({
          kind: "task-cleared",
          nonce: "1",
          userId: "u",
          taskId: "t",
          answers: [],
        }),
      ),
    ).toBeNull();
    expect(
      parseSurveyDraftEvent(
        JSON.stringify({
          kind: "task-cleared",
          nonce: "1",
          userId: "u",
          taskId: "t",
        }),
      ),
    ).toEqual({ kind: "task-cleared", userId: "u", taskId: "t" });
  });
});
