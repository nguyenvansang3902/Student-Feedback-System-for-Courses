import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  ACCESS_COOKIE,
  assertSameOrigin,
  authJson,
  readAuthBody,
} from "@/server/auth/http";
import { apiFailure } from "@/server/auth/api-error";
import { assertCatalogCsrf, issueCatalogCsrf } from "@/server/auth/csrf";
import { AuthError } from "@/server/auth/types";
import { requireCan } from "@/server/policies/can";
import { getActor } from "@/server/services/auth";
import {
  deleteCatalog,
  getCatalog,
  listCatalog,
  listCatalogTeachers,
  lockSemester,
  saveCatalog,
} from "@/server/services/catalog";
import {
  commitImport,
  downloadImportTemplate,
  ImportValidationError,
  MAX_IMPORT_BYTES,
  previewImport,
} from "@/server/services/imports";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ path?: string[] }> };
const entityInput = z.enum([
  "semesters",
  "faculties",
  "departments",
  "courses",
  "sections",
  "teaching",
]);
const kindInput = z.enum(["students", "teachers", "sections", "enrollments"]);

async function catalogActor(request: NextRequest) {
  const raw = request.cookies.get(ACCESS_COOKIE)?.value;
  const actor = raw ? await getActor(raw) : null;
  if (!actor)
    throw new AuthError(
      "Vui lòng đăng nhập để quản lý danh mục.",
      401,
      "INVALID_SESSION",
    );
  requireCan(actor, "catalog:list");
  return actor;
}
const absent = () =>
  authJson({ ok: false, message: "Không tìm thấy chức năng." }, 404);

/** Giới hạn ngay khi đọc stream, kể cả khi không có hoặc giả Content-Length. */
async function importForm(request: NextRequest) {
  const limit = MAX_IMPORT_BYTES + 65_536;
  const type = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data\s*;/i.test(type))
    throw new AuthError("Hãy chọn tệp Excel hoặc CSV.", 415);
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > limit))
    throw new AuthError("Tệp nhập vượt quá giới hạn 2 MiB.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError("Thiếu tệp cần nhập.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new AuthError("Tệp nhập vượt quá giới hạn 2 MiB.", 413);
      }
      chunks.push(value);
    }
    const body = new Uint8Array(Buffer.concat(chunks));
    const form = await new Response(body, {
      headers: { "Content-Type": type },
    }).formData();
    if (
      [...form.keys()].some(
        (key) => key !== "file" && key !== "previewToken",
      ) ||
      form.getAll("file").length !== 1 ||
      form.getAll("previewToken").length > 1
    )
      throw new AuthError("Dữ liệu nhập không hợp lệ.");
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0)
      throw new AuthError("Hãy chọn tệp có dữ liệu.");
    if (file.size > MAX_IMPORT_BYTES)
      throw new AuthError("Tệp nhập vượt quá giới hạn 2 MiB.", 413);
    const previewToken = form.get("previewToken");
    if (
      previewToken !== null &&
      (typeof previewToken !== "string" || previewToken.length > 8192)
    )
      throw new AuthError("Xác nhận chạy thử không hợp lệ.");
    return {
      fileName: file.name,
      content: Buffer.from(await file.arrayBuffer()),
      previewToken: previewToken ?? "",
    };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("Không đọc được tệp gửi lên. Vui lòng chọn lại tệp.");
  } finally {
    reader.releaseLock();
  }
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await catalogActor(request);
    const path = (await context.params).path ?? [];
    const rawQuery = Object.fromEntries(request.nextUrl.searchParams);
    const query = {
      ...rawQuery,
      ...(rawQuery.isActive === undefined
        ? {}
        : {
            isActive:
              z.enum(["true", "false"]).parse(rawQuery.isActive) === "true",
          }),
    };
    if (path.length === 1 && path[0] === "csrf")
      return authJson({ ok: true, csrfToken: issueCatalogCsrf(actor) });
    if (path.length === 1 && path[0] === "teachers")
      return authJson({
        ok: true,
        ...(await listCatalogTeachers(actor, rawQuery)),
      });
    if (path.length === 3 && path[0] === "import" && path[2] === "template") {
      requireCan(actor, "imports:manage");
      const kind = kindInput.parse(path[1]);
      const format = z
        .enum(["csv", "xlsx"])
        .parse(request.nextUrl.searchParams.get("format") ?? "xlsx");
      const template = await downloadImportTemplate(actor, kind, format);
      return new NextResponse(new Uint8Array(template.content), {
        headers: {
          "Content-Type": template.contentType,
          "Content-Disposition": `attachment; filename="${template.fileName.replace(/[^A-Za-z0-9_.-]/g, "_")}"`,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (path.length === 1)
      return authJson({
        ok: true,
        ...(await listCatalog(actor, entityInput.parse(path[0]), query)),
      });
    if (path.length === 2)
      return authJson({
        ok: true,
        item: await getCatalog(actor, entityInput.parse(path[0]), path[1]),
      });
    return absent();
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    assertSameOrigin(request);
    const actor = await catalogActor(request);
    assertCatalogCsrf(request, actor);
    const path = (await context.params).path ?? [];
    if (
      path.length === 3 &&
      path[0] === "import" &&
      (path[2] === "preview" || path[2] === "commit")
    ) {
      requireCan(actor, "imports:manage");
      const kind = kindInput.parse(path[1]);
      const input = await importForm(request);
      const result =
        path[2] === "preview"
          ? await previewImport(actor, {
              kind,
              fileName: input.fileName,
              content: input.content,
            })
          : await commitImport(actor, { kind, ...input });
      return authJson({ ok: true, ...result });
    }
    const input = await readAuthBody(request);
    if (path.length === 1)
      return authJson(
        {
          ok: true,
          item: await saveCatalog(
            actor,
            entityInput.parse(path[0]),
            null,
            input,
          ),
        },
        201,
      );
    if (path.length === 2)
      return authJson({
        ok: true,
        item: await saveCatalog(
          actor,
          entityInput.parse(path[0]),
          path[1],
          input,
        ),
      });
    if (path.length === 3 && path[0] === "semesters" && path[2] === "lock") {
      const data = z
        .object({ reason: z.string().trim().min(10).max(500) })
        .strict()
        .parse(input);
      return authJson({
        ok: true,
        item: await lockSemester(actor, path[1], data),
      });
    }
    if (path.length === 3 && path[2] === "delete") {
      z.object({}).strict().parse(input);
      await deleteCatalog(actor, entityInput.parse(path[0]), path[1]);
      return authJson({ ok: true });
    }
    return absent();
  } catch (error) {
    if (error instanceof ImportValidationError)
      return authJson(
        {
          ok: false,
          message: error.message,
          code: error.code,
          errors: error.errors,
        },
        error.status,
      );
    return apiFailure(error);
  }
}
