import type { NextRequest } from "next/server";
import { z } from "zod";
import { authJson } from "@/server/auth/http";
import { apiFailure } from "@/server/auth/api-error";
import { issueReportsCsrf } from "@/server/auth/csrf";
import { AuthError } from "@/server/auth/types";
import {
  noReportsQuery,
  readReportsBody,
  reportsActor,
  reportsQuery,
} from "@/server/reports-http";
import {
  getReportOptions,
  getReportsDashboard,
  getReportsSettings,
  updateReportsSettings,
  prepareReportsExport,
} from "@/server/services/reports";
import {
  reportFormats,
  reportSettingsMutationSchema,
  reportsQuerySchema,
} from "@/server/services/reports-types";
import { renderReportExport } from "@/server/services/reports-export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ path?: string[] }> };
const missing = () =>
  authJson({ ok: false, message: "Không tìm thấy chức năng báo cáo." }, 404);
const exportSchema = reportsQuerySchema.safeExtend({
  format: z.enum(reportFormats),
});
const types = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

export async function GET(request: NextRequest, context: Context) {
  try {
    const path = (await context.params).path ?? [];
    if (path.length === 1 && path[0] === "csrf") {
      const actor = await reportsActor(request, "reports:settings:write");
      noReportsQuery(request);
      return authJson({ ok: true, csrfToken: issueReportsCsrf(actor) });
    }
    if (path.length === 1 && path[0] === "settings") {
      const actor = await reportsActor(request, "reports:settings:read");
      noReportsQuery(request);
      return authJson({ ok: true, item: await getReportsSettings(actor) });
    }
    if (path.length === 1 && path[0] === "export") {
      const actor = await reportsActor(request, "reports:export"),
        query = exportSchema.parse(reportsQuery(request));
      const dto = await prepareReportsExport(actor, query),
        file = await renderReportExport(dto, query.format);
      if (
        file.mimeType.split(";")[0].trim().toLowerCase() !==
          types[query.format] ||
        !file.bytes.byteLength
      )
        throw new AuthError(
          "Chưa tạo được tệp báo cáo đúng định dạng.",
          503,
          "REPORT_EXPORT_FAILED",
        );
      const fileName = /^[A-Za-z0-9_.-]{1,120}$/.test(file.fileName)
        ? file.fileName
        : `bao-cao-khao-sat.${query.format}`;
      return new Response(new Uint8Array(file.bytes), {
        headers: {
          "Content-Type": file.mimeType,
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    const actor = await reportsActor(request);
    if (!path.length)
      return authJson({
        ok: true,
        item: await getReportsDashboard(
          actor,
          reportsQuerySchema.parse(reportsQuery(request)),
        ),
      });
    if (path.length === 1 && path[0] === "options")
      return authJson({
        ok: true,
        ...(await getReportOptions(
          actor,
          reportsQuerySchema.parse(reportsQuery(request)),
        )),
      });
    return missing();
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: NextRequest, context: Context) {
  try {
    const actor = await reportsActor(request, "reports:settings:write");
    noReportsQuery(request);
    const path = (await context.params).path ?? [];
    if (path.length === 1 && path[0] === "settings")
      return authJson({
        ok: true,
        item: await updateReportsSettings(
          actor,
          reportSettingsMutationSchema.parse(await readReportsBody(request)),
        ),
      });
    return missing();
  } catch (error) {
    return apiFailure(error);
  }
}
