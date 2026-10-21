export type SchemaField = { name: string; kind: string; type: string };
export type SchemaModel = { name: string; fields: SchemaField[] };

/** Đồ thị hai chiều để không bỏ sót quan hệ được khai báo ở đầu bên kia. */
export function relationPath(
  models: SchemaModel[],
  from: string,
  to: string,
): string[] | null {
  const graph = new Map(models.map((model) => [model.name, new Set<string>()]));
  for (const model of models) {
    for (const field of model.fields) {
      if (field.kind !== "object" || !graph.has(field.type)) continue;
      graph.get(model.name)!.add(field.type);
      graph.get(field.type)!.add(model.name);
    }
  }
  const queue: string[][] = [[from]];
  const visited = new Set<string>();
  while (queue.length) {
    const path = queue.shift()!;
    const current = path.at(-1)!;
    if (current === to) return path;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const neighbor of graph.get(current) ?? [])
      queue.push([...path, neighbor]);
  }
  return null;
}

const anonymousFields: Record<string, Record<string, [string, string]>> = {
  SurveyResponse: {
    id: ["scalar", "String"],
    campaignId: ["scalar", "String"],
    sectionId: ["scalar", "String"],
    submittedDate: ["scalar", "DateTime"],
    answers: ["object", "SurveyAnswer"],
  },
  SurveyAnswer: {
    id: ["scalar", "String"],
    responseId: ["scalar", "String"],
    questionId: ["scalar", "String"],
    valueNumber: ["scalar", "Decimal"],
    valueText: ["scalar", "String"],
    valueOptionIds: ["scalar", "Json"],
    valueBoolean: ["scalar", "Boolean"],
    isNotApplicable: ["scalar", "Boolean"],
    moderationStatus: ["enum", "ModerationStatus"],
    moderationReason: ["scalar", "String"],
    response: ["object", "SurveyResponse"],
  },
};

export function anonymityIssues(models: SchemaModel[]): string[] {
  const issues: string[] = [];
  for (const [name, fields] of Object.entries(anonymousFields)) {
    const model = models.find((candidate) => candidate.name === name);
    if (!model) {
      issues.push(`Thiếu model ${name}`);
      continue;
    }
    for (const field of Object.keys(fields))
      if (!model.fields.some((candidate) => candidate.name === field))
        issues.push(`Thiếu trường ${name}.${field}`);
    for (const field of model.fields) {
      const expected = fields[field.name];
      if (!expected)
        issues.push(`${name}.${field.name}: trường ngoài danh sách ẩn danh`);
      else if (field.kind !== expected[0] || field.type !== expected[1])
        issues.push(`${name}.${field.name}: sai loại dữ liệu ẩn danh`);
      const allowedTarget =
        name === "SurveyResponse" && field.name === "answers"
          ? "SurveyAnswer"
          : name === "SurveyAnswer" && field.name === "response"
            ? "SurveyResponse"
            : null;
      if (field.kind === "object" && field.type !== allowedTarget)
        issues.push(`${name}.${field.name}: quan hệ ra ngoài vùng phiếu`);
    }
    for (const target of ["User", "SurveyTask"]) {
      const path = relationPath(models, name, target);
      if (path) issues.push(path.join(" -> "));
    }
  }
  return issues;
}
