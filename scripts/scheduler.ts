import "dotenv/config";
import { setTimeout as delay } from "node:timers/promises";
import { getDb } from "../src/lib/db";
import { ensureDueCampaigns } from "../src/server/services/campaign-lifecycle";
import { processCampaignMailOutbox } from "../src/server/services/campaign-notifications";

const args = process.argv.slice(2);
const once = args.includes("--once");
const intervalIndex = args.indexOf("--interval");
const interval = intervalIndex < 0 ? 60 : Number(args[intervalIndex + 1]);
const recognized = args.filter(
  (value, index) =>
    value === "--once" ||
    value === "--interval" ||
    (index === intervalIndex + 1 && intervalIndex >= 0),
);
if (
  recognized.length !== args.length ||
  !Number.isInteger(interval) ||
  interval < 10 ||
  interval > 3600
)
  throw new Error(
    "Cách dùng: npm run scheduler -- [--once] [--interval 10..3600 giây].",
  );
const actor = {
  kind: "SERVER_CONSOLE" as const,
  reason: "Tiến trình mở đóng đợt và chuyển email vận hành khảo sát",
};
let stop = false;
process.once("SIGINT", () => {
  stop = true;
});
process.once("SIGTERM", () => {
  stop = true;
});
try {
  do {
    try {
      const lifecycle = await ensureDueCampaigns(actor, { limit: 100 });
      const mail = await processCampaignMailOutbox(actor, { limit: 50 });
      console.log(
        JSON.stringify({
          checkedAt: new Date().toISOString(),
          checked: lifecycle.checked,
          opened: lifecycle.opened,
          closed: lifecycle.closed,
          blocked: lifecycle.blocked,
          mailClaimed: mail.claimed,
          mailSent: mail.sent,
          mailFailed: mail.failed,
        }),
      );
    } catch {
      console.error(
        "Lượt scheduler chưa hoàn tất; sẽ thử lại. Không xuất SQL, địa chỉ email hoặc nội dung thông báo.",
      );
      if (once) process.exitCode = 1;
    }
    if (once || stop) break;
    await delay(interval * 1000);
  } while (!stop);
} finally {
  await getDb().$disconnect();
}
