#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import generatorHelper from "@prisma/generator-helper";
const { generatorHandler } = generatorHelper;

// Nhận DMMF thật từ Prisma; không tự phân tích schema bằng biểu thức chính quy.
generatorHandler({
  onManifest() {
    return { prettyName: "DMMF phục vụ kiểm tra thiết kế", defaultOutput: "../src/generated/metadata" };
  },
  async onGenerate(options) {
    const output = options.generator.output?.value;
    if (!output) throw new Error("Thiếu thư mục xuất DMMF.");
    await mkdir(output, { recursive: true });
    await writeFile(join(output, "dmmf.json"), JSON.stringify({ datamodel: options.dmmf.datamodel }, null, 2) + "\n");
  },
});
