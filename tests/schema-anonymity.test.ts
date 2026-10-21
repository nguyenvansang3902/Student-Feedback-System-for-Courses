import { describe, expect, it } from "vitest";
import design from "../src/generated/design-metadata/dmmf.json";
import foundation from "../src/generated/runtime-metadata/dmmf.json";
import {
  anonymityIssues,
  relationPath,
  type SchemaModel,
} from "./helpers/schema-anonymity";
import { assertSeparateShadowDatabase } from "../prisma/database-urls";

const models = design.datamodel.models;
const getModel = (name: string) => {
  const model = models.find((candidate) => candidate.name === name);
  if (!model) throw new Error(`Thiếu model ${name}`);
  return model;
};
const mutated = (): SchemaModel[] => structuredClone(models);

describe("BR-03 — Mục 5.6(a), DMMF của thiết kế đầy đủ", () => {
  it("có đủ các model cần kiểm tra, không cho test qua với schema rỗng", () => {
    for (const name of [
      "SurveyResponse",
      "SurveyAnswer",
      "User",
      "SurveyTask",
      "SurveyCampaign",
      "Question",
    ])
      expect(getModel(name)).toBeDefined();
    expect(anonymityIssues([])).toContain("Thiếu model SurveyResponse");
  });

  it("không có đường quan hệ trực tiếp hoặc gián tiếp từ phiếu/câu trả lời tới User/SurveyTask", () => {
    expect(anonymityIssues(models)).toEqual([]);
    expect(relationPath(models, "SurveyResponse", "SurveyAnswer")).toEqual([
      "SurveyResponse",
      "SurveyAnswer",
    ]);
  });

  it("phát hiện đường qua đợt khảo sát và người tạo đợt", () => {
    const copy = mutated();
    copy
      .find((model) => model.name === "SurveyResponse")!
      .fields.push({
        name: "campaign",
        kind: "object",
        type: "SurveyCampaign",
      });
    expect(
      anonymityIssues(copy).some((issue) =>
        issue.includes("SurveyResponse -> SurveyCampaign -> User"),
      ),
    ).toBe(true);
  });

  it("phát hiện đường qua câu hỏi, nhóm tiêu chí và người tạo mẫu", () => {
    const copy = mutated();
    copy
      .find((model) => model.name === "SurveyAnswer")!
      .fields.push({ name: "question", kind: "object", type: "Question" });
    expect(relationPath(copy, "SurveyAnswer", "User")).toEqual([
      "SurveyAnswer",
      "Question",
      "CriterionGroup",
      "SurveyTemplate",
      "User",
    ]);
  });

  it("phát hiện cầu nối từ model khác dù phiếu không khai báo quan hệ ngược", () => {
    const copy = mutated();
    copy.push({
      name: "UnsafeBridge",
      fields: [
        { name: "response", kind: "object", type: "SurveyResponse" },
        { name: "user", kind: "object", type: "User" },
      ],
    });
    expect(anonymityIssues(copy)).toContain(
      "SurveyResponse -> UnsafeBridge -> User",
    );
  });

  it("chặn thêm định danh scalar kể cả khi không có khóa ngoại", () => {
    for (const name of [
      "studentId",
      "taskId",
      "ipAddress",
      "userAgent",
      "createdAt",
      "fingerprint",
    ]) {
      const copy = mutated();
      copy
        .find((model) => model.name === "SurveyResponse")!
        .fields.push({ name, kind: "scalar", type: "String" });
      expect(
        anonymityIssues(copy).some((issue) =>
          issue.includes(`SurveyResponse.${name}`),
        ),
      ).toBe(true);
    }
  });

  it("chặn đổi đích quan hệ dù vẫn dùng tên field trong whitelist", () => {
    const copy = mutated();
    copy.push({ name: "Tracking", fields: [] });
    copy
      .find((model) => model.name === "SurveyResponse")!
      .fields.find((field) => field.name === "answers")!.type = "Tracking";
    expect(anonymityIssues(copy)).toContain(
      "SurveyResponse.answers: quan hệ ra ngoài vùng phiếu",
    );
  });

  it("chặn đổi metadata scalar thành JSON hoặc bỏ trường bắt buộc", () => {
    const copy = mutated();
    const response = copy.find((model) => model.name === "SurveyResponse")!;
    response.fields.find((field) => field.name === "campaignId")!.type = "Json";
    response.fields = response.fields.filter(
      (field) => field.name !== "submittedDate",
    );
    expect(anonymityIssues(copy)).toContain(
      "SurveyResponse.campaignId: sai loại dữ liệu ẩn danh",
    );
    expect(anonymityIssues(copy)).toContain(
      "Thiếu trường SurveyResponse.submittedDate",
    );
  });

  it("phiếu và câu trả lời dùng UUID, không ID tự tăng; các mốc nộp/hoàn thành chỉ là DATE", () => {
    for (const name of ["SurveyResponse", "SurveyAnswer"]) {
      const id = getModel(name).fields.find((field) => field.name === "id")!;
      expect(id.type).toBe("String");
      expect(id).toHaveProperty(
        "default",
        expect.objectContaining({ name: "uuid" }),
      );
    }
    for (const [model, name] of [
      ["SurveyResponse", "submittedDate"],
      ["SurveyTask", "doneDate"],
    ]) {
      expect(
        getModel(model).fields.find((field) => field.name === name)?.nativeType,
      ).toEqual(["Date", []]);
    }
    expect(
      getModel("SurveyAnswer").fields.filter(
        (field) => field.type === "DateTime",
      ),
    ).toEqual([]);
  });
});

describe("W2 — tính nhất quán schema và phạm vi migration", () => {
  it("schema áp dụng chỉ gồm chín bảng người dùng và danh mục", () => {
    expect(
      foundation.datamodel.models.map((model) => model.name).sort(),
    ).toEqual(
      [
        "User",
        "RoleAssignment",
        "Faculty",
        "Department",
        "Semester",
        "Course",
        "CourseSection",
        "TeachingAssignment",
        "Enrollment",
      ].sort(),
    );
  });

  it("các trường dữ liệu nền không lệch giữa schema áp dụng và thiết kế", () => {
    for (const model of foundation.datamodel.models) {
      const expected = model.fields.filter((field) => field.kind !== "object");
      const actual = getModel(model.name).fields.filter(
        (field) => field.kind !== "object",
      );
      expect(actual, model.name).toEqual(expected);
      for (const field of model.fields.filter(
        (candidate) => candidate.kind === "object",
      )) {
        expect(
          getModel(model.name).fields.find(
            (candidate) => candidate.name === field.name,
          ),
        ).toEqual(field);
      }
      const full = getModel(model.name);
      expect(full.primaryKey).toEqual(model.primaryKey);
      expect(full.uniqueFields).toEqual(model.uniqueFields);
      expect(full.uniqueIndexes).toEqual(model.uniqueIndexes);
    }
    for (const value of foundation.datamodel.enums)
      expect(design.datamodel.enums).toContainEqual(value);
  });
});

describe("W2 — bảo vệ database phát triển khỏi shadow reset", () => {
  it("từ chối cùng database kể cả khác tài khoản hay alias hostname", () => {
    expect(() =>
      assertSeparateShadowDatabase(
        "mysql://dev:sample@127.0.0.1:3306/survey_feedback",
        "mysql://root:other@localhost/survey_feedback",
      ),
    ).toThrow("database riêng");
  });

  it("chấp nhận database shadow riêng và không bắt shadow khi chỉ sinh client", () => {
    expect(() =>
      assertSeparateShadowDatabase(
        "mysql://dev:sample@127.0.0.1:3306/survey_feedback",
        "mysql://dev:sample@127.0.0.1:3306/survey_feedback_shadow",
      ),
    ).not.toThrow();
    expect(() =>
      assertSeparateShadowDatabase(
        "mysql://dev:sample@localhost/survey_feedback",
      ),
    ).not.toThrow();
  });
});
