#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.slice(2).includes("--check");
if (process.argv.slice(2).some((argument) => argument !== "--check")) {
  throw new Error("Cách dùng: node scripts/export-erd.mjs [--check]");
}

const designPath = resolve(root, "src/generated/design-metadata/dmmf.json");
const runtimePath = resolve(root, "src/generated/runtime-metadata/dmmf.json");
const [designText, runtimeText] = await Promise.all([
  readFile(designPath, "utf8"),
  readFile(runtimePath, "utf8"),
]);
const design = JSON.parse(designText).datamodel;
const runtime = JSON.parse(runtimeText).datamodel;
const byName = new Map(design.models.map((model) => [model.name, model]));
const runtimeNames = new Set(runtime.models.map((model) => model.name));
const designOnlyNames = design.models
  .map((model) => model.name)
  .filter((name) => !runtimeNames.has(name));
const assetDirectory = "tuan-08";
const expectedRuntimeNames = new Set([
  "User",
  "Faculty",
  "Department",
  "Semester",
  "Course",
  "CourseSection",
  "TeachingAssignment",
  "Enrollment",
  "RoleAssignment",
  "UserSession",
  "AuthToken",
  "RateLimitBucket",
  "AuditLog",
  "TotpCredential",
  "TotpRecoveryCode",
  "SystemSetting",
  "SurveyTemplate",
  "CriterionGroup",
  "Question",
  "QuestionOption",
  "SurveyCampaign",
  "CampaignSection",
  "CampaignHistory",
  "SurveyTask",
  "SurveyResponse",
  "SurveyAnswer",
  "AggregateResult",
  "Feedback",
  "FeedbackRecipient",
  "FeedbackMessage",
  "FeedbackHistory",
  "CampaignDataConfirmation",
  "Notification",
  "EmailOutbox",
]);
const seedOnlyNames = new Set([
  "AggregateResult",
  "Feedback",
  "FeedbackRecipient",
  "FeedbackMessage",
  "FeedbackHistory",
]);
const week8Names = new Set(["SurveyResponse", "SurveyAnswer"]);
const week7Names = new Set([
  "SurveyCampaign",
  "CampaignSection",
  "CampaignHistory",
  "SurveyTask",
  "CampaignDataConfirmation",
  "Notification",
  "EmailOutbox",
]);
const templateNames = new Set([
  "SurveyTemplate",
  "CriterionGroup",
  "Question",
  "QuestionOption",
]);
const fingerprint = createHash("sha256").update(designText).digest("hex");

const groups = [
  {
    slug: "nen-danh-muc",
    title: "Nền người dùng và danh mục",
    names: [
      "User",
      "Faculty",
      "Department",
      "Semester",
      "Course",
      "CourseSection",
      "TeachingAssignment",
      "Enrollment",
      "RoleAssignment",
      "ImportBatch",
    ],
  },
  {
    slug: "khao-sat",
    title: "Khảo sát, giải trình và nhắc khảo sát",
    names: [
      "SurveyTemplate",
      "CriterionGroup",
      "Question",
      "QuestionOption",
      "SurveyCampaign",
      "CampaignSection",
      "CampaignHistory",
      "SurveyTask",
      "SurveyResponse",
      "SurveyAnswer",
      "AggregateResult",
      "ImprovementPlan",
      "ImprovementHistory",
      "SurveyReminder",
      "CampaignDataConfirmation",
      "SurveyAnomalyFlag",
      "ExamReviewRecommendation",
    ],
  },
  {
    slug: "phan-hoi",
    title: "Phản hồi liên tục",
    names: [
      "Feedback",
      "FeedbackRecipient",
      "FeedbackMessage",
      "FeedbackHistory",
      "FeedbackRating",
      "Attachment",
      "SlaEscalation",
      "InspectionCase",
      "InspectionCaseNote",
      "InspectionCaseEvent",
    ],
  },
  {
    slug: "he-thong",
    title: "Xác thực, thông báo, cấu hình và kiểm toán",
    names: [
      "UserSession",
      "AuthToken",
      "TotpCredential",
      "TotpRecoveryCode",
      "RateLimitBucket",
      "Notification",
      "EmailOutbox",
      "SystemSetting",
      "AuditLog",
    ],
  },
];
const primaryNames = groups.flatMap((group) => group.names);
if (
  design.models.length !== 46 ||
  runtime.models.length !== 34 ||
  designOnlyNames.length !== 12 ||
  seedOnlyNames.size !== 5 ||
  week8Names.size !== 2 ||
  [...seedOnlyNames, ...week8Names].some((name) => !runtimeNames.has(name)) ||
  [...expectedRuntimeNames].some((name) => !runtimeNames.has(name)) ||
  new Set(primaryNames).size !== 46 ||
  primaryNames.some((name) => !byName.has(name))
) {
  throw new Error(
    "Phân nhóm ERD không khớp DMMF: cần 46 model thiết kế, 34 runtime; 5 bảng chỉ seed và 12 model chỉ thiết kế. Tuần 8 hiện thực nộp phiếu qua hai bảng Response/Answer sẵn có, không thêm migration. Mỗi model có đúng một nhóm chính.",
  );
}
if (
  groups[0].names.filter((name) => runtimeNames.has(name)).length !== 9 ||
  runtimeNames.has("ImportBatch")
) {
  throw new Error(
    "Nhóm nền ERD cần chín model danh mục runtime; ImportBatch vẫn chỉ thiết kế P1, chưa được nghiệm thu.",
  );
}

function relations(model) {
  return model.fields.filter(
    (field) => field.kind === "object" && field.relationFromFields?.length,
  );
}

function primaryKey(model) {
  return (
    model.primaryKey?.fields ??
    model.fields.filter((field) => field.isId).map((field) => field.name)
  );
}

function uniqueKeys(model) {
  return [
    ...model.fields
      .filter((field) => field.isUnique)
      .map((field) => [field.name]),
    ...(model.uniqueFields ?? []),
  ];
}

function scalarFields(model) {
  return model.fields.filter((field) => field.kind !== "object");
}

function keysFor(model, field) {
  const keys = [];
  if (primaryKey(model).includes(field.name)) keys.push("PK");
  if (
    relations(model).some((relation) =>
      relation.relationFromFields.includes(field.name),
    )
  )
    keys.push("FK");
  if (uniqueKeys(model).some((fields) => fields.includes(field.name)))
    keys.push("UK");
  return keys;
}

function quoted(value) {
  return String(value)
    .replaceAll('"', "'")
    .replaceAll("\n", " ")
    .replaceAll("\r", " ");
}

function scalarComment(field) {
  const comments = [field.isRequired ? "NOT NULL" : "NULL"];
  if (field.nativeType)
    comments.push(
      `${field.nativeType[0]}${field.nativeType[1].length ? `(${field.nativeType[1].join(",")})` : ""}`,
    );
  if (field.kind === "enum") comments.push("enum");
  if (field.hasDefaultValue)
    comments.push(
      `default ${typeof field.default === "object" ? `${field.default.name}(${(field.default.args ?? []).join(",")})` : String(field.default)}`,
    );
  if (field.isUpdatedAt) comments.push("updatedAt");
  if (
    ["SurveyResponse", "SurveyAnswer"].some((name) =>
      byName.get(name).fields.includes(field),
    ) &&
    ["campaignId", "sectionId", "questionId"].includes(field.name)
  )
    comments.push("metadata scalar - NO FK");
  return comments.join("; ");
}

const anonymousNames = new Set(["SurveyResponse", "SurveyAnswer"]);
for (const model of design.models) {
  for (const relation of relations(model)) {
    if (anonymousNames.has(model.name) !== anonymousNames.has(relation.type)) {
      throw new Error(
        `ERD phát hiện FK vượt ranh giới ẩn danh: ${model.name}.${relation.name} -> ${relation.type}.`,
      );
    }
  }
}

function groupData(group) {
  const members = group.names.map((name) => byName.get(name));
  const contexts = [
    ...new Set(
      members.flatMap((model) =>
        relations(model).map((relation) => relation.type),
      ),
    ),
  ]
    .filter((name) => !group.names.includes(name))
    .sort();
  return { members, contexts: contexts.map((name) => byName.get(name)) };
}

function mermaid(group) {
  const { members, contexts } = groupData(group);
  const lines = ["erDiagram"];
  for (const model of [...members, ...contexts]) {
    lines.push(
      `  %% ${model.name}: ${group.names.includes(model.name) ? "model chính" : "model ngữ cảnh lặp; chỉ FK từ nhóm chính được vẽ"}`,
    );
    lines.push(`  ${model.name} {`);
    for (const field of scalarFields(model)) {
      const keys = keysFor(model, field);
      lines.push(
        `    ${field.type}${field.isList ? "[]" : ""} ${field.name}${keys.length ? ` ${keys.join(", ")}` : ""} "${quoted(scalarComment(field))}"`,
      );
    }
    lines.push("  }");
  }
  for (const model of members) {
    for (const relation of relations(model)) {
      const childFields = relation.relationFromFields;
      const childUnique = [primaryKey(model), ...uniqueKeys(model)].some(
        (fields) =>
          fields.length === childFields.length &&
          fields.every((field) => childFields.includes(field)),
      );
      const parentCardinality = relation.isRequired ? "||" : "|o";
      const childCardinality = childUnique ? "o|" : "o{";
      lines.push(
        `  ${relation.type} ${parentCardinality}--${childCardinality} ${model.name} : "${quoted(`${relation.name}: ${childFields.join("+")}`)}"`,
      );
    }
  }
  return lines.join("\n");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrap(value, width = 53) {
  const words = String(value).split(/\s+/);
  const output = [""];
  for (const word of words) {
    if (output.at(-1).length + word.length + 1 > width && output.at(-1))
      output.push("");
    output[output.length - 1] += `${output.at(-1) ? " " : ""}${word}`;
  }
  return output;
}

function overviewSvg(group) {
  const { members, contexts } = groupData(group);
  const cards = [...members, ...contexts].map((model) => {
    const lines = [
      ...wrap(`PK (${primaryKey(model).join(", ")})`),
      ...uniqueKeys(model).flatMap((fields, index) =>
        wrap(`UK${index + 1} (${fields.join(", ")})`),
      ),
      ...relations(model).flatMap((relation) =>
        wrap(
          `FK (${relation.relationFromFields.join(", ")}) → ${relation.type} (${relation.relationToFields.join(", ")})`,
        ),
      ),
    ];
    if (anonymousNames.has(model.name))
      lines.push(
        ...wrap(
          "VÙNG ẨN DANH: chỉ Response ↔ Answer; metadata scalar không phải FK.",
        ),
      );
    if (model.name === "CriterionGroup")
      lines.push(...wrap("G1: isAssessmentGroup Boolean, mặc định false."));
    if (model.name === "RoleAssignment")
      lines.push(
        ...wrap("G1: 10 vai trò; phạm vi GLOBAL / FACULTY / DEPARTMENT."),
      );
    if (model.name === "SurveyCampaign")
      lines.push(
        ...wrap("Tuần 7: revision/CAS, mốc chốt và hash; cờ lệch dữ liệu."),
      );
    if (model.name === "CampaignDataConfirmation")
      lines.push(
        ...wrap("Bản chụp xác nhận PĐT theo revision; lịch sử chỉ thêm."),
      );
    if (model.name === "EmailOutbox")
      lines.push(
        ...wrap("Tuần 7: hàng chờ email đợt; khóa lease và khóa chống trùng."),
      );
    if (model.name === "SurveyTask")
      lines.push(
        ...wrap(
          "Tuần 8: PENDING → DONE có điều kiện; chỉ ngày, không ID phiếu.",
        ),
      );
    if (week8Names.has(model.name))
      lines.push(
        ...wrap(
          "Tuần 8: nộp ẩn danh bằng UUID và DATE; không ghi cầu nối danh tính.",
        ),
      );
    return {
      model,
      context: !group.names.includes(model.name),
      lines,
      height: 92 + lines.length * 23,
    };
  });
  const columns = 3;
  const width = 1632;
  const cardWidth = 510;
  const gap = 24;
  let y = 176;
  const shapes = [];
  for (let row = 0; row < cards.length; row += columns) {
    const current = cards.slice(row, row + columns);
    const rowHeight = Math.max(...current.map((card) => card.height));
    current.forEach((card, column) => {
      const x = 27 + column * (cardWidth + gap);
      const { model, context, lines } = card;
      const color = anonymousNames.has(model.name)
        ? "#0f766e"
        : context
          ? "#64748b"
          : "#1e40af";
      const migrationLabel = runtimeNames.has(model.name)
        ? seedOnlyNames.has(model.name)
          ? "Tuần 5: chỉ seed dữ liệu demo"
          : templateNames.has(model.name)
            ? "Tuần 6 + G1: mẫu phiếu/nhóm đánh giá"
            : week8Names.has(model.name)
              ? "Tuần 8: nộp phiếu ẩn danh"
              : week7Names.has(model.name)
                ? "Tuần 7: đợt/xác nhận/thông báo đợt"
                : "Đã migrate đến Tuần 4"
        : "Thiết kế tương lai; chưa migration";
      const cardMeta = `${context ? "Ngữ cảnh lặp · " : ""}${migrationLabel} · ${scalarFields(model).length} scalar`;
      shapes.push(
        `<g aria-label="${escapeXml(model.name)}"><rect x="${x}" y="${y}" width="${cardWidth}" height="${rowHeight}" rx="14" fill="${context ? "#f1f5f9" : "#ffffff"}" stroke="${color}" stroke-width="2"/><rect x="${x}" y="${y}" width="${cardWidth}" height="48" rx="14" fill="${color}"/><rect x="${x}" y="${y + 28}" width="${cardWidth}" height="20" fill="${color}"/><text x="${x + 18}" y="${y + 31}" class="model">${escapeXml(model.name)}</text><text x="${x + 18}" y="${y + 72}" class="meta">${escapeXml(cardMeta)}</text>${lines.map((line, index) => `<text x="${x + 18}" y="${y + 101 + index * 23}" class="field">${escapeXml(line)}</text>`).join("")}</g>`,
      );
    });
    y += rowHeight + 25;
  }
  const height = y + 81;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description"><title id="title">ERD tổng quan: ${escapeXml(group.title)}</title><desc id="description">${group.names.length} model chính và ${contexts.length} model ngữ cảnh. Thẻ liệt kê khóa chính, khóa duy nhất và khóa ngoại từ DMMF. SVG được sinh trực tiếp, không render Mermaid. Tuần 8: 46 model thiết kế, 34 runtime, 12 model chỉ thiết kế. Nhiệm vụ và nộp phiếu ẩn danh dùng Response/Answer sẵn có; 5 bảng kết quả/phản hồi còn chỉ seed. Chi tiết toàn bộ scalar nằm trong ERD.md.</desc><style>text{font-family:'Segoe UI',Arial,sans-serif;fill:#0f172a}.heading{font-size:29px;font-weight:700}.sub{font-size:17px;fill:#475569}.model{font-size:22px;font-weight:700;fill:#fff}.meta{font-size:15px;fill:#475569}.field{font-size:15px;font-family:Consolas,'Courier New',monospace}.foot{font-size:14px;fill:#475569}</style><rect width="${width}" height="${height}" fill="#f8fafc"/><text x="27" y="48" class="heading">${escapeXml(group.title)}</text><text x="27" y="82" class="sub">${group.names.length} model chính · ${contexts.length} model ngữ cảnh · PK / UK / FK lấy từ DMMF thật</text><text x="27" y="113" class="sub">SVG tổng quan dạng thẻ quan hệ; không phải bản render Mermaid. Xem đầy đủ scalar và liên kết ở docs/ERD.md.</text><text x="27" y="143" class="sub">Xanh dương: miền chính · Xám: ngữ cảnh · Xanh lục: vùng ẩn danh chỉ nối Response/Answer.</text>${shapes.join("")}<text x="27" y="${y + 20}" class="foot">Sinh từ prisma/design.prisma qua DMMF · 46 model thiết kế / 34 runtime / 12 chỉ thiết kế · Tuần 8, cập nhật thực tế 29/10/2026</text><text x="27" y="${y + 45}" class="foot">SHA-256 DMMF: ${fingerprint}</text></svg>\n`;
}

function constraintTables(group) {
  const lines = [
    "| Model chính | PK | UK (mỗi cặp ngoặc là một khóa, không phải từng cột độc lập) |",
    "| --- | --- | --- |",
  ];
  for (const name of group.names) {
    const model = byName.get(name);
    lines.push(
      `| ${name} | (${primaryKey(model).join(", ")}) | ${
        uniqueKeys(model)
          .map((fields) => `(${fields.join(", ")})`)
          .join("; ") || "—"
      } |`,
    );
  }
  lines.push(
    "",
    "| Model.field | FK → đích | Bắt buộc | onDelete / onUpdate |",
    "| --- | --- | --- | --- |",
  );
  for (const name of group.names) {
    for (const relation of relations(byName.get(name))) {
      lines.push(
        `| ${name}.${relation.name} | (${relation.relationFromFields.join(", ")}) → ${relation.type}(${relation.relationToFields.join(", ")}) | ${relation.isRequired ? "Có" : "Không"} | ${relation.relationOnDelete ?? "mặc định Prisma"} / ${relation.relationOnUpdate ?? "mặc định Prisma"} |`,
      );
    }
  }
  return lines.join("\n");
}

const markdown = [
  "# ERD toàn hệ thống — Tuần 8: nhiệm vụ và nộp khảo sát ẩn danh",
  "",
  "<!-- Tự sinh bởi scripts/export-erd.mjs. Sửa schema rồi generate và chạy exporter; không sửa tay phần sinh. -->",
  "",
  "Thiết kế khởi tạo **21/10/2026**, cập nhật Tuần 8 ngày **29/10/2026** theo yêu cầu bắt đầu tuần kế tiếp bằng lời tự nhiên. Phạm vi mã nguồn gồm luồng đợt/xác nhận/chốt nhiệm vụ của Tuần 7 và danh sách nhiệm vụ, form động, nháp trình duyệt, nộp một lần, xác nhận ẩn danh của Tuần 8. Chưa triển khai tổng hợp/công bố kết quả hoặc xử lý phản hồi. ERD thể hiện cấu trúc và phạm vi mã nguồn; bằng chứng nghiệm thu chức năng được kiểm riêng, không suy từ hình.",
  "",
  `Nguồn: DMMF thật được Prisma sinh từ \`prisma/design.prisma\` (**${design.models.length} model thiết kế**), đối chiếu \`prisma/schema.prisma\` runtime (**${runtime.models.length} model**, gồm 4 bảng mẫu, 7 bảng đợt/xác nhận/hàng chờ email, 2 bảng phiếu ẩn danh thuộc Tuần 8 và 5 bảng còn chỉ seed demo). **${designOnlyNames.length} model còn chỉ thiết kế**, chưa migrate. Tuần 8 dùng cấu trúc Response/Answer đã có, không thêm model hoặc migration. SHA-256 DMMF thiết kế: \`${fingerprint}\`.`,
  "",
  "## Cách đọc và tái tạo",
  "",
  "- Tuần 2 có chín model nền; Tuần 3–4 thêm xác thực, MFA và cấu hình, tổng 16. Tuần 5 thêm 15 model seed demo theo quyền người dùng ngày 22/10/2026, tổng 31 runtime / 39 thiết kế. Tuần 6 hiện thực 4 bảng mẫu; G1 giữ 31 runtime, thêm 10 vai trò/cờ nhóm và thiết kế 46 model. Tuần 7 promote CampaignDataConfirmation, Notification và EmailOutbox vào runtime, thành **34 runtime / 46 thiết kế / 12 model chưa migrate**. Báo cáo/gallery các tuần trước giữ nguyên bằng chứng lịch sử.",
  "- 4 bảng mẫu phiếu thuộc Tuần 6: SurveyTemplate, CriterionGroup, Question, QuestionOption. **7 bảng thuộc chức năng Tuần 7:** SurveyCampaign, CampaignSection, CampaignHistory, SurveyTask, CampaignDataConfirmation, Notification, EmailOutbox. **2 bảng phiếu thuộc chức năng Tuần 8:** SurveyResponse, SurveyAnswer. SurveyTask được Tuần 8 dùng cho quyền trên nhiệm vụ đã chốt và cập nhật PENDING → DONE cùng transaction chèn phiếu. **5 bảng còn chỉ seed:** AggregateResult, Feedback, FeedbackRecipient, FeedbackMessage, FeedbackHistory. Có seed không thay nghiệm thu kết quả/phản hồi các tuần sau.",
  "- SurveyTemplate.version là phiên bản nghiệp vụ trong familyId; revision là số sửa để CAS chống ghi đè. CriterionGroup.isAssessmentGroup mặc định false do ĐBCL đặt ở form nhóm, được giữ khi nhân bản/tạo phiên bản; cây mẫu khóa cũ không tự đổi. Cờ này chưa mở trang kết quả gộp của Khảo thí (Tuần 9). Những thay đổi này không tạo liên kết từ SurveyResponse/SurveyAnswer sang danh tính.",
  "- SurveyCampaign.revision/updatedAt phục vụ CAS; openedAt/openedSnapshotHash/dataDriftDetected ghi thời điểm chốt thực tế và phát hiện lệch. CampaignDataConfirmation lưu hash, số lớp/cặp và revision của lần PĐT xác nhận/trả về; CampaignHistory thêm action/requestId/requestHash/campaignRevision cho truy vết và chống lặp, không sửa lịch sử cũ.",
  "- Notification/EmailOutbox ở Tuần 7 chỉ phục vụ thông báo gia hạn/biến động dữ liệu; không nhận đã hoàn thành trung tâm thông báo, SLA hoặc nhắc khảo sát của Tuần 9/11. EmailOutbox có idempotencyKey và lease cho các tiến trình gửi đồng thời. Hai bảng này ở miền hệ thống, không nối tới vùng phiếu ẩn danh.",
  "- Tuần 8 xác minh owner/task, phiên mới, học kỳ chưa khóa, đợt DANG_MO trong khoảng đóng [startsAt, endsAt], mẫu khóa và giá trị đúng câu/option trước khi ghi. Cập nhật task có điều kiện phải ảnh hưởng đúng một hàng rồi mới chèn Response/Answer UUID; lỗi rollback cả ba phần. doneDate/submittedDate cùng ngày Asia/Ho_Chi_Minh, không có mốc giờ chính xác trong vùng phiếu. Nháp chỉ nằm ở trình duyệt; xác nhận không trả ID hoặc nội dung phiếu. Không thêm FK, audit/log/queue hoặc model ánh xạ nối danh tính với phiếu.",
  `- Model chỉ thiết kế cho các tuần sau: ${designOnlyNames.map((name) => `\`${name}\``).join(", ")}. Hồ sơ Thanh tra, bất thường, kiến nghị và các luồng tương lai chưa có migration/runtime workflow; ImportBatch P1 vẫn chưa được nghiệm thu.`,
  "- Bốn sơ đồ có đúng 46 model chính (10 + 17 + 10 + 9); model ngữ cảnh lặp để đọc FK vượt miền, không cộng vào tổng. Tất cả scalar/enum và PK/UK/FK được sinh từ DMMF; object navigation không được lặp thành cột.",
  "- `PK` là khóa chính; `UK` là thành viên khóa duy nhất; `FK` chỉ xuất hiện khi DMMF có relationFromFields thật. Với khóa ghép, ký hiệu trên cột không nói từng cột duy nhất riêng: đọc bảng khóa ngay sau sơ đồ. Kiểu vật lý, NULL/default được ghi trong chú thích thuộc tính; danh mục enum ở cuối.",
  "- Cardinality sinh từ required/optional của quan hệ và unique của tập FK: cha bắt buộc/một hoặc tùy chọn/không–một; phía con không–nhiều hoặc không–một khi FK unique. Không khẳng định cha phải có ít nhất một con chỉ từ sự tồn tại FK.",
  "- SVG tổng quan dạng thẻ được exporter sinh trực tiếp từ DMMF, **không phải render Mermaid**. SVG liệt kê PK/UK/FK và số scalar; các khối Mermaid là ERD đầy đủ thuộc tính/liên kết. Mở SVG trong trình xem để đọc ngay cả khi trình xem Markdown không hỗ trợ Mermaid.",
  "- Chạy `npm run db:generate`, rồi `node scripts/export-erd.mjs` để ghi lại Markdown/SVG; chạy `node scripts/export-erd.mjs --check` để chỉ so nội dung hiện có với DMMF và thoát lỗi nếu cũ/thiếu. Không cần thêm thư viện. Check này kiểm tài liệu khớp schema, không thay test ẩn danh, migration hay kết quả render Mermaid.",
  "",
  "## Ranh giới ẩn danh bắt buộc",
  "",
  "`SurveyResponse` và `SurveyAnswer` chỉ nối với nhau qua `SurveyAnswer.responseId`. `SurveyResponse.campaignId`, `sectionId` và `SurveyAnswer.questionId` là **scalar metadata không có FK/navigation** tới Campaign/Section/Question. Không vẽ đường liên kết giả chỉ vì tên cột kết thúc bằng Id. Không có studentId/taskId/IP/User-Agent hoặc đường quan hệ từ hai model phiếu tới User/SurveyTask; không dùng các ID metadata để xây include/join làm tái định danh.",
  "",
  "`SurveyTask` giữ trạng thái hoàn thành và ngày DONE, độc lập với phiếu. Hạn chế vẫn là ẩn danh mức ứng dụng: người có quyền hạ tầng có thể suy luận từ DB/log và lớp ít người; ngưỡng công bố BR-07 vẫn bắt buộc. Kênh Feedback có liên kết tác giả để đối thoại, khác thiết kế SurveyResponse.",
  "",
  ...groups.flatMap((group, index) => {
    const { contexts } = groupData(group);
    return [
      `## ${index + 1}. ${group.title} — ${group.names.length} model chính`,
      "",
      `Model chính: ${group.names.map((name) => `\`${name}\``).join(", ")}.`,
      "",
      contexts.length
        ? `Ngữ cảnh lặp: ${contexts.map((model) => `\`${model.name}\``).join(", ")}. Chỉ vẽ FK từ model chính; không mở rộng đệ quy quan hệ của model ngữ cảnh.`
        : "Không cần model ngữ cảnh ngoài nhóm.",
      "",
      `![ERD tổng quan ${group.title}](assets/${assetDirectory}/erd-${group.slug}.svg)`,
      "",
      `[Mở SVG tổng quan](assets/${assetDirectory}/erd-${group.slug}.svg) — SVG sinh trực tiếp từ DMMF, không render Mermaid.`,
      "",
      "```mermaid",
      mermaid(group),
      "```",
      "",
      constraintTables(group),
      "",
    ];
  }),
  "## Danh mục enum từ DMMF",
  "",
  "| Enum | Giá trị |",
  "| --- | --- |",
  ...design.enums.map(
    (entry) =>
      `| ${entry.name} | ${entry.values.map((value) => value.name).join(", ")} |`,
  ),
  "",
  "## Giới hạn và quy tắc ngoài ERD",
  "",
  "ERD thể hiện cấu trúc và FK thật, không tự thực thi policy, trạng thái, SLA, ngưỡng công bố, transaction nộp phiếu hay kiểm nội dung tệp. Các CHECK bổ sung của migration nền, indexes vật lý và quyết định phân giai đoạn đọc cùng migration/ADR/kiến trúc; DMMF không cung cấp đầy đủ mọi SQL CHECK và index thường nên không nhận chúng đã được kiểm chỉ bằng hình. Thay schema cần generate lại metadata, exporter, test thiết kế và migration đúng phạm vi tuần.",
  "",
].join("\n");

const formatOptions = (await resolveConfig(resolve(root, "docs/ERD.md"))) ?? {};
const outputs = await Promise.all(
  [
    [resolve(root, "docs/ERD.md"), markdown],
    ...groups.map((group) => [
      resolve(root, `docs/assets/${assetDirectory}/erd-${group.slug}.svg`),
      overviewSvg(group),
    ]),
  ].map(async ([path, content]) => [
    path,
    await format(content, {
      ...formatOptions,
      filepath: path,
      parser: path.endsWith(".svg") ? "html" : "markdown",
    }),
  ]),
);

const outdated = [];
for (const [path, content] of outputs) {
  if (check) {
    const actual = await readFile(path, "utf8").catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (actual?.replaceAll("\r\n", "\n") !== content)
      outdated.push(relative(root, path));
  } else {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }
}
if (outdated.length) {
  throw new Error(
    `ERD không khớp DMMF hoặc thiếu file: ${outdated.join(", ")}. Chạy node scripts/export-erd.mjs.`,
  );
}
console.log(
  `ERD ${check ? "khớp" : "đã xuất"}: ${design.models.length} model thiết kế / ${runtime.models.length} model runtime / ${designOnlyNames.length} model chỉ thiết kế; Tuần 8 hiện thực 2 bảng Response/Answer sẵn có, 5 bảng còn chỉ seed. 4 khối Mermaid, 4 SVG tổng quan sinh trực tiếp; vùng ẩn danh chỉ nối Response/Answer.`,
);
