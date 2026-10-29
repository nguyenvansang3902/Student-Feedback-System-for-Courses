// Chỉ DDL fixture kiểm rollback Tuần8 trên database thử đã có marker.
import "dotenv/config";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mysql, requireMysql, identifier } from "./mysql.mjs";
const input = JSON.parse(readFileSync(0, "utf8"));
assert.deepEqual(Object.keys(input).sort(), [
  "mode",
  "questionId",
  "triggerName",
]);
assert(["create", "drop"].includes(input.mode));
assert(/^w8_w8[a-f0-9]{8}_answer_fail$/.test(input.triggerName));
assert(
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
    input.questionId,
  ),
);
const marker = JSON.parse(
  readFileSync(".local/week4-test-database.json", "utf8"),
);
const test = new URL(process.env.W4_TEST_DATABASE_URL ?? "");
assert(marker.purpose === "isolated-week4-tests");
assert(
  test.protocol === "mysql:" &&
    ["127.0.0.1", "localhost"].includes(test.hostname),
);
assert(
  test.pathname === `/${marker.database}` &&
    marker.database !== marker.mainDatabase,
);
assert(marker.mainDatabase === process.env.MYSQL_DATABASE);
assert(
  new RegExp(
    `^${identifier(marker.mainDatabase, "Main").slice(0, 35)}_w4test_[a-f0-9]{8}$`,
  ).test(marker.database),
);
const database = identifier(marker.database, "Test");
const root = (sql) =>
  requireMysql(mysql(`USE \`${database}\`;\n${sql}`, { root: true }));
assert.equal(
  // Hai cột để mysql --batch phân tách bằng tab thật; CONCAT(CHAR(9)) bị escape.
  root("SELECT @@server_uuid, DATABASE();"),
  `${marker.serverUuid}\t${database}`,
);
const prefix = input.triggerName.slice(3, -12).toUpperCase();
assert(/^W8[a-f0-9]{8}$/i.test(prefix));
const owned = root(
  `SELECT COUNT(*) FROM Question q JOIN CriterionGroup g ON g.id=q.groupId JOIN SurveyTemplate t ON t.id=g.templateId JOIN User u ON u.id=t.createdById WHERE q.id='${input.questionId}' AND u.loginCode LIKE '${prefix}-%';`,
);
assert.equal(
  owned,
  "1",
  "Trigger chỉ được áp dụng câu hỏi fixture do nhóm test hiện tại tạo",
);
const exists = root(
  `SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA='${database}' AND TRIGGER_NAME='${input.triggerName}';`,
);
if (input.mode === "create") {
  assert.equal(exists, "0");
  root(
    `DELIMITER //
CREATE TRIGGER \`${input.triggerName}\` BEFORE INSERT ON \`SurveyAnswer\` FOR EACH ROW BEGIN IF NEW.questionId = '${input.questionId}' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'W8 controlled answer failure'; END IF; END//
DELIMITER ;`,
  );
} else if (exists === "1") {
  const table = root(
    `SELECT EVENT_OBJECT_TABLE FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA='${database}' AND TRIGGER_NAME='${input.triggerName}';`,
  );
  assert.equal(table, "SurveyAnswer");
  const statement = root(
    `SELECT ACTION_STATEMENT FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA='${database}' AND TRIGGER_NAME='${input.triggerName}';`,
  );
  assert(statement.includes(`NEW.questionId = '${input.questionId}'`));
  assert(statement.includes("W8 controlled answer failure"));
  root(`DROP TRIGGER \`${input.triggerName}\`;`);
}
console.log(
  "DDL trigger fixture Tuần8 hoàn tất; không thay GLOBAL settings/database hoặc dữ liệu.",
);
