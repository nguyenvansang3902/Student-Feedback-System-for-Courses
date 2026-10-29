import type {
  StudentSurveyAnswerInput,
  StudentSurveyQuestion,
  StudentSurveyTemplate,
} from "@/server/services/student-survey-types";

export const SURVEY_DRAFT_PREFIX = "sfs:survey-draft:v1:";
export const SURVEY_DRAFT_EVENT_KEY = "sfs:survey-draft-event:v1";
export const MAX_DRAFT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_DRAFT_BYTES = 262_144;
const MAX_DRAFTS = 20;
export type SurveyAnswers = Record<string, StudentSurveyAnswerInput>;
export interface DraftStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export interface DraftContext {
  userId: string;
  taskId: string;
  template: StudentSurveyTemplate;
  endsAt: string;
}
const taskPrefix = (context: DraftContext) =>
  `${SURVEY_DRAFT_PREFIX}${encodeURIComponent(context.userId)}:${encodeURIComponent(context.taskId)}:`;
export const surveyDraftKey = (context: DraftContext) =>
  `${taskPrefix(context)}${encodeURIComponent(context.template.id)}:${context.template.version}`;
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, allowed: string[]) =>
  Object.keys(value).every((key) => allowed.includes(key));

export function isSurveyAnswerFilled(
  question: StudentSurveyQuestion,
  answer?: StudentSurveyAnswerInput,
): boolean {
  if (!answer) return false;
  if (answer.isNotApplicable) return question.allowNA;
  switch (question.type) {
    case "LIKERT":
      return (
        Number.isInteger(answer.valueNumber) &&
        answer.valueNumber! >= question.scaleMin! &&
        answer.valueNumber! <= question.scaleMax!
      );
    case "TEXT":
      return !!answer.valueText?.trim() && answer.valueText.length <= 4000;
    case "BOOLEAN":
      return typeof answer.valueBoolean === "boolean";
    case "SINGLE_CHOICE":
      return (
        answer.valueOptionIds?.length === 1 &&
        question.options.some(
          (option) => option.id === answer.valueOptionIds![0],
        )
      );
    case "MULTIPLE_CHOICE":
      return (
        !!answer.valueOptionIds?.length &&
        new Set(answer.valueOptionIds).size === answer.valueOptionIds.length &&
        answer.valueOptionIds.every((id) =>
          question.options.some((option) => option.id === id),
        )
      );
  }
}

/** Nhận đúng kiểu của phiên bản mẫu đang khóa; không giữ trường lạ từ localStorage. */
export function parseDraftAnswers(
  value: unknown,
  template: StudentSurveyTemplate,
): SurveyAnswers | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  const questions = new Map(
    template.groups.flatMap((group) =>
      group.questions.map((question) => [question.id, question] as const),
    ),
  );
  const result: SurveyAnswers = {};
  for (const raw of value) {
    if (
      !record(raw) ||
      typeof raw.questionId !== "string" ||
      !exactKeys(raw, [
        "questionId",
        "isNotApplicable",
        "valueNumber",
        "valueText",
        "valueOptionIds",
        "valueBoolean",
      ])
    )
      return null;
    const question = questions.get(raw.questionId);
    if (
      !question ||
      Object.hasOwn(result, question.id) ||
      (raw.isNotApplicable !== undefined &&
        typeof raw.isNotApplicable !== "boolean")
    )
      return null;
    const filled = [
      "valueNumber",
      "valueText",
      "valueOptionIds",
      "valueBoolean",
    ].filter((key) => raw[key] !== undefined);
    if (raw.isNotApplicable) {
      if (!question.allowNA || filled.length) return null;
      result[question.id] = { questionId: question.id, isNotApplicable: true };
      continue;
    }
    const answer: StudentSurveyAnswerInput = { questionId: question.id };
    if (filled.length > 1) return null;
    switch (question.type) {
      case "LIKERT":
        if (
          filled.some((key) => key !== "valueNumber") ||
          (raw.valueNumber !== undefined &&
            (typeof raw.valueNumber !== "number" ||
              !Number.isInteger(raw.valueNumber) ||
              raw.valueNumber < question.scaleMin! ||
              raw.valueNumber > question.scaleMax!))
        )
          return null;
        if (typeof raw.valueNumber === "number")
          answer.valueNumber = raw.valueNumber;
        break;
      case "TEXT":
        if (
          filled.some((key) => key !== "valueText") ||
          (raw.valueText !== undefined &&
            (typeof raw.valueText !== "string" ||
              raw.valueText.length > 4000 ||
              /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(
                raw.valueText,
              )))
        )
          return null;
        if (typeof raw.valueText === "string") answer.valueText = raw.valueText;
        break;
      case "BOOLEAN":
        if (
          filled.some((key) => key !== "valueBoolean") ||
          (raw.valueBoolean !== undefined &&
            typeof raw.valueBoolean !== "boolean")
        )
          return null;
        if (typeof raw.valueBoolean === "boolean")
          answer.valueBoolean = raw.valueBoolean;
        break;
      case "SINGLE_CHOICE":
      case "MULTIPLE_CHOICE": {
        if (filled.some((key) => key !== "valueOptionIds")) return null;
        const options = raw.valueOptionIds;
        if (
          options !== undefined &&
          (!Array.isArray(options) ||
            options.length > 20 ||
            new Set(options).size !== options.length ||
            options.some(
              (id) =>
                typeof id !== "string" ||
                !question.options.some((option) => option.id === id),
            ) ||
            (question.type === "SINGLE_CHOICE" && options.length > 1))
        )
          return null;
        if (Array.isArray(options)) answer.valueOptionIds = options as string[];
        break;
      }
    }
    result[question.id] = answer;
  }
  return result;
}

function keys(storage: DraftStorage, prefix: string): string[] {
  const result: string[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key?.startsWith(prefix)) result.push(key);
  }
  return result;
}
export function browserDraftStorage(): DraftStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
export type SurveyDraftEvent =
  { kind: "logout" } | { kind: "task-cleared"; userId: string; taskId: string };
function publishDraftEvent(event: SurveyDraftEvent, storage: DraftStorage) {
  if (typeof window === "undefined") return;
  // Chỉ metadata điều phối giữa các tab; không có nội dung phiếu hoặc token.
  const raw = JSON.stringify({
    ...event,
    nonce: `${Date.now()}:${Math.random()}`,
  });
  if (typeof window.dispatchEvent === "function")
    window.dispatchEvent(
      new CustomEvent(SURVEY_DRAFT_EVENT_KEY, { detail: raw }),
    );
  storage.setItem(SURVEY_DRAFT_EVENT_KEY, raw);
  storage.removeItem(SURVEY_DRAFT_EVENT_KEY);
}
export function parseSurveyDraftEvent(raw: string): SurveyDraftEvent | null {
  if (raw.length > 1024) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!record(data) || typeof data.nonce !== "string" || data.nonce.length > 80)
    return null;
  if (data.kind === "logout" && exactKeys(data, ["kind", "nonce"]))
    return { kind: "logout" };
  if (
    data.kind === "task-cleared" &&
    exactKeys(data, ["kind", "nonce", "userId", "taskId"]) &&
    typeof data.userId === "string" &&
    data.userId.length <= 200 &&
    typeof data.taskId === "string" &&
    data.taskId.length <= 200
  )
    return { kind: "task-cleared", userId: data.userId, taskId: data.taskId };
  return null;
}
export function subscribeSurveyDraftEvents(
  handler: (event: SurveyDraftEvent) => void,
): () => void {
  const listener = (event: StorageEvent) => {
    if (event.key !== SURVEY_DRAFT_EVENT_KEY || !event.newValue) return;
    const parsed = parseSurveyDraftEvent(event.newValue);
    if (parsed) handler(parsed);
  };
  const ownListener = (event: Event) => {
    const raw: unknown = (event as CustomEvent<unknown>).detail;
    const parsed = typeof raw === "string" ? parseSurveyDraftEvent(raw) : null;
    if (parsed) handler(parsed);
  };
  window.addEventListener("storage", listener);
  window.addEventListener(SURVEY_DRAFT_EVENT_KEY, ownListener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(SURVEY_DRAFT_EVENT_KEY, ownListener);
  };
}
export function clearAllSurveyDrafts(
  storage = browserDraftStorage(),
  broadcast = true,
): boolean {
  if (!storage) return false;
  try {
    for (const key of keys(storage, SURVEY_DRAFT_PREFIX))
      storage.removeItem(key);
    if (broadcast) publishDraftEvent({ kind: "logout" }, storage);
    return true;
  } catch {
    return false;
  }
}
export function clearTaskSurveyDrafts(
  context: Pick<DraftContext, "userId" | "taskId">,
  storage = browserDraftStorage(),
  broadcast = true,
): boolean {
  if (!storage) return false;
  const prefix = `${SURVEY_DRAFT_PREFIX}${encodeURIComponent(context.userId)}:${encodeURIComponent(context.taskId)}:`;
  try {
    for (const key of keys(storage, prefix)) storage.removeItem(key);
    if (broadcast)
      publishDraftEvent(
        {
          kind: "task-cleared",
          userId: context.userId,
          taskId: context.taskId,
        },
        storage,
      );
    return true;
  } catch {
    return false;
  }
}
export type DraftLoad = {
  state: "empty" | "restored" | "expired" | "invalid" | "unavailable";
  answers: SurveyAnswers;
};
export function loadSurveyDraft(
  context: DraftContext,
  storage = browserDraftStorage(),
  now = Date.now(),
): DraftLoad {
  if (!storage) return { state: "unavailable", answers: {} };
  const key = surveyDraftKey(context);
  try {
    // Bản mẫu khác của cùng nhiệm vụ không được phục hồi.
    for (const oldKey of keys(storage, taskPrefix(context)))
      if (oldKey !== key) storage.removeItem(oldKey);
    const raw = storage.getItem(key);
    if (!raw) return { state: "empty", answers: {} };
    const discard = (state: "invalid" | "expired"): DraftLoad => {
      storage.removeItem(key);
      return { state, answers: {} };
    };
    if (
      raw.length > MAX_DRAFT_BYTES ||
      new TextEncoder().encode(raw).length > MAX_DRAFT_BYTES
    )
      return discard("invalid");
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return discard("invalid");
    }
    if (
      !record(data) ||
      !exactKeys(data, ["savedAt", "answers"]) ||
      typeof data.savedAt !== "number" ||
      !Number.isFinite(data.savedAt)
    )
      return discard("invalid");
    if (now - data.savedAt > MAX_DRAFT_AGE_MS || data.savedAt > now + 60_000)
      return discard("expired");
    const answers = parseDraftAnswers(data.answers, context.template);
    if (!answers) return discard("invalid");
    return { state: "restored", answers };
  } catch {
    return { state: "unavailable", answers: {} };
  }
}
export function saveSurveyDraft(
  context: DraftContext,
  answers: SurveyAnswers,
  storage = browserDraftStorage(),
  now = Date.now(),
): boolean {
  if (!storage) return false;
  // Hạn đợt có thể được gia hạn. Chỉ DTO trạng thái mới từ máy chủ quyết định xóa vì hết hạn.
  const parsed = parseDraftAnswers(Object.values(answers), context.template);
  if (!parsed) return false;
  const raw = JSON.stringify({ savedAt: now, answers: Object.values(parsed) });
  if (new TextEncoder().encode(raw).length > MAX_DRAFT_BYTES) return false;
  try {
    const key = surveyDraftKey(context);
    for (const oldKey of keys(storage, taskPrefix(context)))
      if (oldKey !== key) storage.removeItem(oldKey);
    const otherKeys = keys(storage, SURVEY_DRAFT_PREFIX).filter(
      (oldKey) => oldKey !== key,
    );
    for (const oldKey of otherKeys.slice(
      0,
      Math.max(0, otherKeys.length - MAX_DRAFTS + 1),
    ))
      storage.removeItem(oldKey);
    storage.setItem(key, raw);
    return true;
  } catch {
    return false;
  }
}
