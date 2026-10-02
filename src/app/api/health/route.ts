import { getHealthReport } from "../../../lib/health";

export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json(getHealthReport(), {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
