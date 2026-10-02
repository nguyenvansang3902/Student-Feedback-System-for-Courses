import { readFileSync } from "node:fs";

const priorityWeights = { P0: 3, P1: 2, P2: 1 };
const progressText = readFileSync(
  new URL("../docs/PROGRESS.md", import.meta.url),
  "utf8",
);
const stateText = readFileSync(
  new URL("../docs/PROJECT_STATE.md", import.meta.url),
  "utf8",
);
const currentWeek = Number(
  stateText.match(/^- Tuần hiện tại:\s*Tuần\s+(\d+)/im)?.[1],
);

if (!Number.isInteger(currentWeek) || currentWeek < 1 || currentWeek > 15) {
  throw new Error("Không đọc được tuần hiện tại trong docs/PROJECT_STATE.md.");
}

const requirements = [];
const seenCodes = new Set();
let moduleName = "";

for (const line of progressText.split(/\r?\n/)) {
  const heading = line.match(/^##\s+(M\d+\s+.+)$/);
  if (heading) {
    moduleName = heading[1];
    continue;
  }

  if (!line.startsWith("- [")) continue;

  const match = line.match(/^- \[([ xX])\]\s+(FR-\d+)\s+\[(P[012])\]\s+(.+)$/);
  if (!match || !moduleName) {
    throw new Error(`Dòng FR sai định dạng hoặc thiếu module: ${line}`);
  }

  const [, mark, code, priority, description] = match;
  if (seenCodes.has(code))
    throw new Error(`Mã FR trùng trong PROGRESS.md: ${code}`);
  seenCodes.add(code);

  const plannedWeek = Number(description.match(/\(Tuần\s+(\d+)\)/i)?.[1]);
  requirements.push({
    code,
    moduleName,
    weight: priorityWeights[priority],
    done: mark.toLowerCase() === "x",
    plannedWeek:
      Number.isInteger(plannedWeek) && plannedWeek >= 1 ? plannedWeek : null,
  });
}

if (requirements.length === 0)
  throw new Error("PROGRESS.md chưa có yêu cầu FR nào.");

const sum = (items, predicate) =>
  items.reduce((total, item) => total + (predicate(item) ? item.weight : 0), 0);
const percent = (part, total) => ((part / total) * 100).toFixed(1);
const totalWeight = sum(requirements, () => true);
const doneWeight = sum(requirements, (item) => item.done);
const plannedWeight = sum(
  requirements,
  (item) => item.plannedWeek !== null && item.plannedWeek <= currentWeek,
);

console.log(
  `Tiến độ tổng: ${percent(doneWeight, totalWeight)}% (${doneWeight}/${totalWeight} điểm)`,
);
console.log(
  `Kế hoạch lũy kế đến Tuần ${currentWeek}: ${percent(plannedWeight, totalWeight)}% (${plannedWeight}/${totalWeight} điểm)`,
);
console.log("Theo module:");

for (const name of [...new Set(requirements.map((item) => item.moduleName))]) {
  const items = requirements.filter((item) => item.moduleName === name);
  const moduleTotal = sum(items, () => true);
  const moduleDone = sum(items, (item) => item.done);
  console.log(
    `- ${name}: ${percent(moduleDone, moduleTotal)}% (${moduleDone}/${moduleTotal} điểm)`,
  );
}

console.log(
  "Ghi chú: FR chưa xếp tuần vẫn nằm trong mẫu số, nhưng không vào mục tiêu tuần.",
);
