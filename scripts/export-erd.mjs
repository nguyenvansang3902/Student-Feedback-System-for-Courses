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
]);
const seedOnlyNames = new Set([
  "SurveyTemplate", "CriterionGroup", "Question", "QuestionOption",
  "SurveyCampaign", "CampaignSection", "CampaignHistory", "SurveyTask",
  "SurveyResponse", "SurveyAnswer", "AggregateResult", "Feedback",
  "FeedbackRecipient", "FeedbackMessage", "FeedbackHistory",
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
  design.models.length !== 39 ||
  runtime.models.length !== 31 ||
  [...expectedRuntimeNames].some((name) => !runtimeNames.has(name)) ||
  new Set(primaryNames).size !== 39 ||
  primaryNames.some((name) => !byName.has(name))
) {
  throw new Error(
    "Phân nhóm ERD không khớp DMMF: cần 39 model thiết kế, đúng 31 model Tuần 5 gồm 15 bảng chỉ phục vụ seed đã được người dùng cho phép, và mỗi model có đúng một nhóm chính. Cập nhật nhóm có chủ đích khi schema thay đổi.",
  );
}
if (groups[0].names.some((name) => !runtimeNames.has(name))) {
  throw new Error(
    "Nhóm nền ERD không khớp chín model danh mục của Tuần 2 trong runtime hiện tại.",
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
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description"><title id="title">ERD tổng quan: ${escapeXml(group.title)}</title><desc id="description">${group.names.length} model chính và ${contexts.length} model ngữ cảnh. Thẻ liệt kê khóa chính, khóa duy nhất và khóa ngoại từ DMMF. SVG được sinh trực tiếp, không render Mermaid. Tuần 5 có 15 bảng chỉ seed demo theo quyền người dùng, chưa có workflow nghiệp vụ. Chi tiết toàn bộ scalar nằm trong ERD.md.</desc><style>text{font-family:'Segoe UI',Arial,sans-serif;fill:#0f172a}.heading{font-size:29px;font-weight:700}.sub{font-size:17px;fill:#475569}.model{font-size:22px;font-weight:700;fill:#fff}.meta{font-size:15px;fill:#475569}.field{font-size:15px;font-family:Consolas,'Courier New',monospace}.foot{font-size:14px;fill:#475569}</style><rect width="${width}" height="${height}" fill="#f8fafc"/><text x="27" y="48" class="heading">${escapeXml(group.title)}</text><text x="27" y="82" class="sub">${group.names.length} model chính · ${contexts.length} model ngữ cảnh · PK / UK / FK lấy từ DMMF thật</text><text x="27" y="113" class="sub">SVG tổng quan dạng thẻ quan hệ; không phải bản render Mermaid. Xem đầy đủ scalar và liên kết ở docs/ERD.md.</text><text x="27" y="143" class="sub">Xanh dương: miền chính · Xám: ngữ cảnh · Xanh lục: vùng ẩn danh chỉ nối Response/Answer.</text>${shapes.join("")}<text x="27" y="${y + 20}" class="foot">Sinh từ prisma/design.prisma qua DMMF · 39 model thiết kế / 31 model runtime Tuần 5 (15 bảng chỉ seed demo) · Cập nhật thực tế 22/10/2026</text><text x="27" y="${y + 45}" class="foot">SHA-256 DMMF: ${fingerprint}</text></svg>\n`;
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
  "# ERD toàn hệ thống — cập nhật Tuần 5",
  "",
  "<!-- Tự sinh bởi scripts/export-erd.mjs. Sửa schema rồi generate và chạy exporter; không sửa tay phần sinh. -->",
  "",
  "Thiết kế khởi tạo **21/10/2026**, cập nhật phạm vi migration Tuần 5 ngày **22/10/2026**. Kế hoạch Tuần 5 giả định 28/10–03/11/2026; làm sớm theo lệnh người dùng, không ghi lùi ngày. Ngày 22/10 người dùng cho phép bổ sung dữ liệu seed khảo sát/phản hồi sớm: 15 bảng mới chỉ phục vụ seed, chưa có workflow/UI/API nghiệp vụ khảo sát/phản hồi. ERD phân biệt thiết kế dữ liệu với chức năng đã chạy.",
  "",
  `Nguồn: DMMF thật được Prisma sinh từ \`prisma/design.prisma\` (**${design.models.length} model thiết kế**), đối chiếu \`prisma/schema.prisma\` runtime (**${runtime.models.length} model Tuần 5**, gồm 15 bảng chỉ seed demo được người dùng cho phép). SHA-256 DMMF thiết kế: \`${fingerprint}\`.`,
  "",
  "## Cách đọc và tái tạo",
  "",
  "- Tuần 2 có chín model nền; Tuần 3 thêm UserSession/AuthToken/RateLimitBucket/AuditLog; Tuần 4 thêm TotpCredential/TotpRecoveryCode/SystemSetting, tổng 16. Tuần 5 thêm **15 model chỉ seed demo** theo quyền người dùng ngày 22/10/2026, tổng **31 runtime / 39 thiết kế**. **8 model còn lại** chưa migrate. Bảng seed không đồng nghĩa hoàn thành FR nghiệp vụ các tuần sau; báo cáo/gallery Tuần 2–4 giữ bằng chứng tại thời điểm đó.",
  "- 15 bảng seed mới: SurveyTemplate, CriterionGroup, Question, QuestionOption, SurveyCampaign, CampaignSection, CampaignHistory, SurveyTask, SurveyResponse, SurveyAnswer, AggregateResult, Feedback, FeedbackRecipient, FeedbackMessage, FeedbackHistory. Chỉ tạo dữ liệu giả bằng CLI, chưa có API/UI xử lý chúng. Blueprint 39 model và thân bốn Mermaid không đổi khi chỉ vật chất hóa một phần thiết kế vào runtime.",
  "- Bốn sơ đồ có đúng 39 model chính (9 + 14 + 7 + 9); model ngữ cảnh lặp để đọc FK vượt miền, không cộng vào tổng. Tất cả scalar/enum và PK/UK/FK được sinh từ DMMF; object navigation không được lặp thành cột.",
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
      `![ERD tổng quan ${group.title}](assets/tuan-02/erd-${group.slug}.svg)`,
      "",
      `[Mở SVG tổng quan](assets/tuan-02/erd-${group.slug}.svg) — SVG sinh trực tiếp từ DMMF, không render Mermaid.`,
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
      resolve(root, `docs/assets/tuan-02/erd-${group.slug}.svg`),
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
  `ERD ${check ? "khớp" : "đã xuất"}: ${design.models.length} model thiết kế / ${runtime.models.length} model runtime Tuần 5 (15 bảng chỉ seed được người dùng cho phép), 4 Mermaid, 4 SVG tổng quan; vùng ẩn danh chỉ nối Response/Answer.`,
);
