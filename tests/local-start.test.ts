import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isProjectProcess,
  localStartDecision,
  validateLocalEnvironment,
  withToolPaths,
  // Script chỉ dùng builtin; import không tự chạy launcher.
  // @ts-expect-error Mô-đun vận hành Node.js không cần phát hành declaration.
} from "../scripts/start-local.mjs";

const root = resolve(".local", "project with spaces");
const environment = {
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "mysql://dev:fixture-only@127.0.0.1:3306/local_test",
  MYSQL_DATABASE: "local_test",
  MYSQL_USER: "dev",
  MYSQL_PASSWORD: "fixture-only",
  MYSQL_ROOT_PASSWORD: "fixture-root-only",
  JWT_SECRET: "a".repeat(64),
  MFA_ENCRYPTION_KEY: "b".repeat(64),
};
const web = {
  pid: 71,
  commandLine: `node "${root}/node_modules/next/dist/server/lib/start-server.js"`,
};
const healthy = {
  status: "ok",
  application: "available",
  database: "not_checked",
};

describe("Khởi động cục bộ — giữ dữ liệu và tránh hai máy chủ cùng sinh tệp", () => {
  it("tệp CMD thực tế dùng CRLF để Windows không cắt lệch lệnh khi mở trực tiếp", () => {
    const script = readFileSync(
      new URL("../KHOI_DONG_DU_AN.cmd", import.meta.url),
      "utf8",
    );
    expect(script.startsWith("@echo off\r\n")).toBe(true);
    expect(script).not.toMatch(/(?<!\r)\n/);
  });
  it("giữ đường dẫn Docker khi Windows truyền biến Path thay vì PATH", () => {
    const env = { Path: "C:\\Docker;C:\\Windows" };
    const result = withToolPaths(env, ["C:\\Node"], "win32");
    expect(result.PATH).toBe("C:\\Node;C:\\Docker;C:\\Windows");
    expect(result).not.toHaveProperty("Path");
    expect(env.Path).toBe("C:\\Docker;C:\\Windows");
  });
  it("gộp alias Path/PATH của Windows nhưng giữ quy tắc PATH của Unix", () => {
    expect(
      withToolPaths({ Path: "one", PATH: "two" }, ["node"], "win32").PATH,
    ).toBe("node;one;two");
    expect(
      withToolPaths({ Path: "unrelated", PATH: "/bin" }, ["/node"], "linux"),
    ).toMatchObject({ Path: "unrelated", PATH: "/node:/bin" });
  });
  it("nhận tác vụ nền cũ dùng đường dẫn tương đối khi loader thuộc đúng checkout", () => {
    expect(
      isProjectProcess(
        {
          pid: 72,
          commandLine: `node --import "file://${root}/node_modules/tsx/dist/loader.mjs" scripts/scheduler.ts`,
        },
        root,
        "scheduler",
      ),
    ).toBe(true);
    expect(
      isProjectProcess(
        {
          pid: 73,
          commandLine:
            'node --import "file:///other/node_modules/tsx/dist/loader.mjs" scripts/scheduler.ts',
        },
        root,
        "scheduler",
      ),
    ).toBe(false);
  });
  it("đọc cấu hình hợp lệ, cố định origin cục bộ và không thay đổi đối số", () => {
    const actual = validateLocalEnvironment(environment, "24.21.0");
    expect(actual).toMatchObject({
      APP_URL: environment.APP_URL,
      DATABASE_URL: environment.DATABASE_URL,
      NODE_ENV: "development",
      SFS_TEST_DIST_DIR: "",
    });
    expect(environment).not.toHaveProperty("NODE_ENV");
  });
  it("không chạy với Node cũ dù thư viện đã có", () => {
    expect(() => validateLocalEnvironment(environment, "23.0.0")).toThrow(
      "Node.js 24",
    );
  });
  it("không tự sửa APP_URL khác vì origin POST phải khớp địa chỉ trình duyệt", () => {
    expect(() =>
      validateLocalEnvironment(
        { ...environment, APP_URL: "http://127.0.0.1:3003" },
        "24.21.0",
      ),
    ).toThrow("APP_URL");
  });
  it("không sinh lại khóa còn thiếu hoặc làm lộ chuỗi kết nối trong lỗi", () => {
    expect(() =>
      validateLocalEnvironment({ ...environment, JWT_SECRET: "" }, "24.21.0"),
    ).toThrow("không ghi đè khóa");
    try {
      validateLocalEnvironment(
        {
          ...environment,
          DATABASE_URL:
            "mysql://dev:do-not-print-me@remote.invalid:3306/private_name",
        },
        "24.21.0",
      );
      throw new Error("phải từ chối");
    } catch (error) {
      expect(String(error)).not.toContain("do-not-print-me");
      expect(String(error)).not.toContain("private_name");
      expect(String(error)).toContain("MySQL cục bộ");
    }
  });
  it("database URL phải đúng database Compose, không trỏ nhầm shadow hoặc bộ kiểm", () => {
    expect(() =>
      validateLocalEnvironment(
        { ...environment, MYSQL_DATABASE: "another_database" },
        "24.21.0",
      ),
    ).toThrow("MySQL cục bộ");
  });
  it("nhận đúng Next child của thư mục chứa khoảng trắng", () => {
    expect(isProjectProcess(web, root, "web")).toBe(true);
    expect(
      isProjectProcess(
        {
          ...web,
          commandLine: `node "${root}/node_modules/next/dist/bin/next" dev --port 3000`,
        },
        root,
        "web",
      ),
    ).toBe(true);
  });
  it("không nhận PID tái sử dụng hoặc dự án có tiền tố tên gần giống", () => {
    expect(
      isProjectProcess(
        { ...web, commandLine: "node another-project.js" },
        root,
        "web",
      ),
    ).toBe(false);
    expect(
      isProjectProcess(
        {
          ...web,
          commandLine: `node "${root}-other/node_modules/next/dist/server/lib/start-server.js"`,
        },
        root,
        "web",
      ),
    ).toBe(false);
    expect(isProjectProcess({ ...web, pid: 0 }, root, "web")).toBe(false);
  });
  it("scheduler có đường dẫn URI đã mã hóa vẫn được nhận để không mở trùng", () => {
    const commandLine = `node --import file:///${encodeURI(root.replaceAll("\\", "/"))}/node_modules/tsx/dist/loader.mjs "${root}/scripts/scheduler.ts"`;
    expect(isProjectProcess({ pid: 72, commandLine }, root, "scheduler")).toBe(
      true,
    );
    expect(isProjectProcess({ pid: 72, commandLine }, root, "web")).toBe(false);
  });
  it("tái sử dụng web khỏe của đúng thư mục; không đi nhánh generate/migration", () => {
    expect(
      localStartDecision(
        {
          available: false,
          health: healthy,
          processes: [web],
          listenerPids: [web.pid],
        },
        root,
      ),
    ).toBe("reuse");
  });
  it("từ chối listener không thuộc dự án kể cả trả được health giống ứng dụng", () => {
    expect(() =>
      localStartDecision(
        {
          available: false,
          health: healthy,
          processes: [web],
          listenerPids: [88],
        },
        root,
      ),
    ).toThrow("không tự đóng");
  });
  it("không chiếm cổng khi ứng dụng cũ có tiến trình nhưng không trả HTTP", () => {
    expect(() =>
      localStartDecision(
        {
          available: false,
          health: null,
          processes: [web],
          listenerPids: [web.pid],
        },
        root,
      ),
    ).toThrow("chưa sẵn sàng");
  });
  it("không generate khi còn một Next dev khác của cùng checkout ở cổng thử", () => {
    expect(() =>
      localStartDecision(
        { available: true, health: null, processes: [web], listenerPids: [] },
        root,
      ),
    ).toThrow("cổng khác");
  });
  it("đợi build hoặc Prisma chạy xong trước khi tạo tệp client", () => {
    for (const commandLine of [
      `node "${root}/node_modules/next/dist/bin/next" build`,
      `node "${root}/node_modules/prisma/build/index.js" generate`,
    ])
      expect(() =>
        localStartDecision(
          {
            available: true,
            health: null,
            processes: [{ pid: 74, commandLine }],
            listenerPids: [],
          },
          root,
        ),
      ).toThrow("dựng bản mới");
  });
  it("chỉ đi nhánh mở mới khi cổng trống và không có máy chủ/chuẩn bị khác", () => {
    expect(
      localStartDecision(
        { available: true, health: null, processes: [], listenerPids: [] },
        root,
      ),
    ).toBe("start");
  });
});
