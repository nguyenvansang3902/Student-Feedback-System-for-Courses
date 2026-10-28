import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ mysql: vi.fn(), spawnSync: vi.fn() }));
vi.mock("node:child_process", () => ({ spawnSync: mocks.spawnSync }));
vi.mock("../scripts/lib/mysql.mjs", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  mysql: mocks.mysql,
}));

async function runPreflight() {
  // @ts-expect-error Script vận hành .mjs không có declaration TypeScript.
  await import("../scripts/amendment-preflight.mjs");
}

beforeEach(() => {
  vi.resetModules();
  mocks.mysql.mockReset();
  mocks.spawnSync.mockReset();
  vi.stubEnv("DATABASE_URL", "mysql://fake:fake@127.0.0.1:3306/survey_test");
  vi.spyOn(console, "log").mockImplementation(() => {});
  mocks.spawnSync.mockImplementation((_command: string, args: string[]) => ({
    status: 0,
    stdout:
      args[0] === "compose"
        ? "0.0.0.0:3306\n[::]:3306\n"
        : "npipe:////./pipe/dockerDesktopLinuxEngine\n",
  }));
  mocks.mysql
    .mockReturnValueOnce({ status: 0, stdout: "1\n" })
    .mockReturnValue({ status: 0, stdout: "0\n" });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("G1 — preflight trước DDL Điều chỉnh 01", () => {
  it("cho phép DB có Feedback nhưng không còn loại trộn CSVC_LICH_HOC; chỉ đọc đúng database đích", async () => {
    await expect(runPreflight()).resolves.toBeUndefined();
    expect(mocks.mysql.mock.calls.map(([sql]) => sql)).toEqual([
      "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='survey_test' AND TABLE_NAME='Feedback';",
      "SELECT COUNT(*) FROM `survey_test`.Feedback WHERE category = 'CSVC_LICH_HOC';",
    ]);
    expect(mocks.spawnSync).toHaveBeenCalledTimes(2);
    expect(
      mocks.spawnSync.mock.calls.every(([command]) => command === "docker"),
    ).toBe(true);
    expect(console.log).toHaveBeenCalledOnce();
  });

  it("DB mới chưa có bảng Feedback không truy vấn bảng chưa tồn tại", async () => {
    mocks.mysql.mockReset().mockReturnValue({ status: 0, stdout: "0\n" });
    await expect(runPreflight()).resolves.toBeUndefined();
    expect(mocks.mysql).toHaveBeenCalledOnce();
    expect(mocks.mysql.mock.calls[0][0]).toContain("information_schema.TABLES");
  });

  it("dừng khi còn dữ liệu loại cũ, không tự phân loại hoặc thực thi bất kỳ DDL/DML nào", async () => {
    mocks.mysql
      .mockReset()
      .mockReturnValueOnce({ status: 0, stdout: "1\n" })
      .mockReturnValueOnce({ status: 0, stdout: "2\n" });
    await expect(runPreflight()).rejects.toThrow(
      "cần người dùng xác nhận cách phân loại",
    );
    expect(mocks.mysql.mock.calls.every(([sql]) => /^SELECT /u.test(sql))).toBe(
      true,
    );
    expect(
      mocks.spawnSync.mock.calls.every(([, args]) => !args.includes("migrate")),
    ).toBe(true);
    expect(console.log).not.toHaveBeenCalled();
  });

  it("không kiểm Compose 3306 rồi cho phép Prisma dùng server khác ở 3307", async () => {
    vi.stubEnv("DATABASE_URL", "mysql://fake:fake@localhost:3307/survey_test");
    await expect(runPreflight()).rejects.toThrow("không khớp cổng MySQL");
    expect(mocks.mysql).not.toHaveBeenCalled();
  });

  it("từ chối Docker context remote dù cổng công bố trùng", async () => {
    mocks.spawnSync.mockImplementation((_command: string, args: string[]) => ({
      status: 0,
      stdout:
        args[0] === "compose"
          ? "0.0.0.0:3306\n"
          : "tcp://remote.invalid:2376\n",
    }));
    await expect(runPreflight()).rejects.toThrow("không khớp cổng MySQL");
    expect(mocks.mysql).not.toHaveBeenCalled();
  });

  it("chấp nhận Docker socket cục bộ trên Linux và cổng mặc định trong URL", async () => {
    vi.stubEnv("DATABASE_URL", "mysql://fake:fake@localhost/survey_test");
    mocks.spawnSync.mockImplementation((_command: string, args: string[]) => ({
      status: 0,
      stdout:
        args[0] === "compose"
          ? "127.0.0.1:3306\n"
          : "unix:///var/run/docker.sock\n",
    }));
    await expect(runPreflight()).resolves.toBeUndefined();
    expect(mocks.mysql).toHaveBeenCalledTimes(2);
  });

  it.each([
    "mysql://fake:fake@remote.invalid:3306/survey_test",
    "postgresql://fake:fake@localhost:3306/survey_test",
  ])(
    "từ chối datasource ngoài MySQL cục bộ trước mọi subprocess: %s",
    async (url) => {
      vi.stubEnv("DATABASE_URL", url);
      await expect(runPreflight()).rejects.toThrow("chỉ hỗ trợ MySQL cục bộ");
      expect(mocks.spawnSync).not.toHaveBeenCalled();
      expect(mocks.mysql).not.toHaveBeenCalled();
    },
  );

  it("lỗi Docker hoặc SQL không bị coi là không có dữ liệu cũ", async () => {
    mocks.spawnSync.mockReturnValueOnce({ status: 1, stdout: "" });
    await expect(runPreflight()).rejects.toThrow("không khớp cổng MySQL");
    expect(mocks.mysql).not.toHaveBeenCalled();
    vi.resetModules();
    mocks.mysql
      .mockReset()
      .mockReturnValue({ status: 1, stderr: "ERROR 1045 private data" });
    await expect(runPreflight()).rejects.toThrow("MySQL 1045");
    expect(console.log).not.toHaveBeenCalled();
  });
});
