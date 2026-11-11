import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { constants, createReadStream, createWriteStream } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  writeFile,
} from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const identifier = /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/;
const dockerName = /^[a-z0-9][a-z0-9_-]*$/;
const storageKey =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:png|jpg|pdf)$/;
const digestPattern = /^[0-9a-f]{64}$/;
const maxAttachmentBytes = 5 * 1024 * 1024;
const repo = await realpath(fileURLToPath(new URL("..", import.meta.url)));
const manifestName = "manifest.json";
const sqlName = "database.sql";

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function options(args) {
  const [mode, ...flags] = args;
  requireCondition(
    ["backup", "restore"].includes(mode),
    "Dùng backup hoặc restore với --context, --project, --database, --bundle và --quiesced.",
  );
  const values = new Map();
  const accepted = new Set([
    "--context",
    "--project",
    "--database",
    "--bundle",
    "--attachments",
  ]);
  for (let index = 0; index < flags.length; index += 1) {
    const key = flags[index];
    requireCondition(!values.has(key), `Tham số lặp lại: ${key}.`);
    if (key === "--quiesced") {
      values.set(key, true);
      continue;
    }
    requireCondition(accepted.has(key), `Tham số không hợp lệ: ${key}.`);
    const value = flags[index + 1];
    requireCondition(
      value && !value.startsWith("--"),
      `Thiếu giá trị cho ${key}.`,
    );
    values.set(key, value);
    index += 1;
  }
  const context = values.get("--context");
  const project = values.get("--project");
  const database = values.get("--database");
  const bundle = values.get("--bundle");
  requireCondition(
    dockerName.test(context ?? "") &&
      dockerName.test(project ?? "") &&
      bundle &&
      identifier.test(database ?? "") &&
      !["mysql", "sys", "performance_schema", "information_schema"].includes(
        database.toLowerCase(),
      ),
    "Cần chỉ rõ Docker context, tên dự án Compose, schema ứng dụng và đường dẫn gói sao lưu.",
  );
  requireCondition(
    values.has("--quiesced"),
    "Dừng ứng dụng, scheduler và mọi tiến trình ghi, rồi truyền --quiesced.",
  );
  if (mode === "restore") {
    requireCondition(
      /^sfs-restore-[a-z0-9][a-z0-9_-]*$/.test(project),
      "Chỉ khôi phục vào dự án Compose riêng có tên sfs-restore-<tên>.",
    );
  }
  return {
    mode,
    context,
    project,
    database,
    bundle,
    attachments: values.get("--attachments"),
  };
}

async function command(args) {
  try {
    return (
      await run("docker", args, {
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true,
      })
    ).stdout;
  } catch {
    throw new Error(
      `Lệnh Docker ${args[0] === "--context" ? args[2] : args[0]} thất bại. Kiểm tra engine, container và quyền truy cập.`,
    );
  }
}

function docker(config, args) {
  return command(["--context", config.context, ...args]);
}

async function streamDocker(config, args, transfer, message) {
  const child = spawn("docker", ["--context", config.context, ...args], {
    stdio: ["pipe", "pipe", "ignore"],
    windowsHide: true,
  });
  const completed = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) =>
      code === 0 ? resolve() : reject(new Error(message)),
    );
  });
  try {
    await Promise.all([completed, transfer(child)]);
  } catch {
    child.kill();
    throw new Error(message);
  }
}

function trimLines(output) {
  return output.trim().split(/\r?\n/).filter(Boolean);
}

async function selectDatabase(config) {
  const active = (await command(["context", "show"])).trim();
  requireCondition(
    active === config.context,
    "Docker context hiện tại khác --context. Dừng trước khi truy cập dữ liệu.",
  );
  const host = (
    await command([
      "context",
      "inspect",
      config.context,
      "--format",
      '{{(index .Endpoints "docker").Host}}',
    ])
  ).trim();
  requireCondition(
    /^(?:npipe|unix):\/\//.test(host),
    "Chỉ hỗ trợ Docker engine cục bộ qua socket hoặc named pipe.",
  );
  const engine = (await docker(config, ["info", "--format", "{{.ID}}"])).trim();
  requireCondition(engine, "Không xác minh được Docker engine.");
  const containers = trimLines(
    await docker(config, [
      "ps",
      "--no-trunc",
      "--filter",
      `label=com.docker.compose.project=${config.project}`,
      "--format",
      '{{.ID}} {{.Label "com.docker.compose.service"}}',
    ]),
  ).map((line) => line.split(" "));
  const databases = containers.filter(([, service]) => service === "db");
  requireCondition(
    databases.length === 1,
    "Dự án phải có đúng một service db đang chạy.",
  );
  requireCondition(
    containers.every(([, service]) => ["db", "mailpit"].includes(service)),
    "Dự án còn container có thể ghi dữ liệu. Dừng web, scheduler và các service ghi trước.",
  );
  const [[container]] = databases;
  const health = (
    await docker(config, [
      "inspect",
      "--format",
      "{{if .State.Health}}{{.State.Health.Status}}{{end}}",
      container,
    ])
  ).trim();
  requireCondition(health === "healthy", "MySQL chưa healthy.");
  const mounts = JSON.parse(
    await docker(config, [
      "inspect",
      "--format",
      "{{json .Mounts}}",
      container,
    ]),
  );
  const data = mounts.find(
    ({ Destination }) => Destination === "/var/lib/mysql",
  );
  requireCondition(
    data?.Type === "volume" && data.Name,
    "MySQL phải dùng named volume riêng cho dự án Compose.",
  );
  await assertOwnedVolume(config, data.Name);
  const configuredDatabase = (
    await docker(config, [
      "exec",
      container,
      "sh",
      "-ec",
      'printf "%s" "${MYSQL_DATABASE:?}"',
    ])
  ).trim();
  requireCondition(
    configuredDatabase === config.database,
    "MYSQL_DATABASE của container khác --database.",
  );
  const image = (
    await docker(config, ["inspect", "--format", "{{.Image}}", container])
  ).trim();
  return { ...config, engine, container, volume: data.Name, image };
}

async function assertOwnedVolume(config, volume, label) {
  requireCondition(dockerName.test(volume), "Tên named volume không hợp lệ.");
  const labels = JSON.parse(
    await docker(config, [
      "volume",
      "inspect",
      "--format",
      "{{json .Labels}}",
      volume,
    ]),
  );
  requireCondition(
    labels?.["com.docker.compose.project"] === config.project &&
      (!label || labels?.["com.docker.compose.volume"] === label),
    "Named volume phải thuộc đúng dự án Compose đã chỉ định.",
  );
}

// Mật khẩu chỉ được nạp bên trong container; không chuyển vào argv hoặc log trên host.
const mysqlScript = [
  'if [ -n "${MYSQL_PASSWORD_FILE:-}" ]; then MYSQL_PASSWORD=$(cat "$MYSQL_PASSWORD_FILE"); fi',
  'if [ -n "${MYSQL_USER_FILE:-}" ]; then MYSQL_USER=$(cat "$MYSQL_USER_FILE"); fi',
  'export MYSQL_PWD="${MYSQL_PASSWORD:?}"',
  "client=$1; shift",
  'exec "$client" --protocol=TCP --host=127.0.0.1 --user="${MYSQL_USER:?}" "$@"',
].join("\n");

function mysqlArgs(config, client, args, interactive = false) {
  return [
    "exec",
    ...(interactive ? ["--interactive"] : []),
    config.container,
    "sh",
    "-ec",
    mysqlScript,
    "sfs-backup",
    client,
    ...args,
  ];
}

function query(config, sql) {
  return docker(
    config,
    mysqlArgs(config, "mysql", [
      "--batch",
      "--skip-column-names",
      "--default-character-set=utf8mb4",
      `--database=${config.database}`,
      "--execute",
      sql,
    ]),
  );
}

async function schemaInfo(config) {
  const [version, charset, collation] = (
    await query(
      config,
      `
    SELECT VERSION(), DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME
    FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = DATABASE()
  `,
    )
  )
    .trim()
    .split("\t");
  requireCondition(
    /^8\.4\./.test(version ?? "") && charset === "utf8mb4" && collation,
    "Quy trình này cần MySQL 8.4 và schema utf8mb4.",
  );
  return { version, charset, collation };
}

async function tableNames(config) {
  const invalid = (
    await query(
      config,
      `
    SELECT (SELECT COUNT(*) FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND (TABLE_TYPE <> 'BASE TABLE' OR ENGINE <> 'InnoDB'))
      + (SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE())
      + (SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE())
      + (SELECT COUNT(*) FROM information_schema.EVENTS WHERE EVENT_SCHEMA = DATABASE())
  `,
    )
  ).trim();
  requireCondition(
    invalid === "0",
    "Schema chỉ được chứa các bảng InnoDB của ứng dụng.",
  );
  const names = trimLines(
    await query(
      config,
      `
    SELECT TABLE_NAME FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() ORDER BY BINARY TABLE_NAME
  `,
    ),
  );
  requireCondition(
    names.every((name) => identifier.test(name)),
    "Tên bảng không thuộc định dạng được hỗ trợ.",
  );
  return names;
}

async function snapshot(config, names) {
  const tables = names.length
    ? trimLines(
        await query(
          config,
          names
            .map((name) => `SELECT '${name}', COUNT(*) FROM \`${name}\``)
            .join(" UNION ALL "),
        ),
      ).map((line) => {
        const [name, rows] = line.split("\t");
        return { name, rows };
      })
    : [];
  const attachments = names.includes("Attachment")
    ? trimLines(
        await query(
          config,
          `
    SELECT storageKey, byteSize, sha256 FROM Attachment ORDER BY BINARY storageKey
  `,
        ),
      ).map((line) => {
        const [key, bytes, sha256] = line.split("\t");
        return { key, bytes: Number(bytes), sha256 };
      })
    : [];
  validateSnapshot(tables, attachments);
  return { tables, attachments };
}

function validateSnapshot(tables, attachments) {
  requireCondition(
    Array.isArray(tables) &&
      tables.every(
        (t) => t && identifier.test(t.name) && /^\d+$/.test(t.rows),
      ) &&
      new Set(tables.map(({ name }) => name)).size === tables.length &&
      Array.isArray(attachments) &&
      attachments.every(
        (a) =>
          a &&
          storageKey.test(a.key) &&
          Number.isInteger(a.bytes) &&
          a.bytes > 0 &&
          a.bytes <= maxAttachmentBytes &&
          digestPattern.test(a.sha256),
      ) &&
      new Set(attachments.map(({ key }) => key)).size === attachments.length,
    "Metadata bảng hoặc tệp đính kèm không hợp lệ.",
  );
}

async function fileDigest(path) {
  const hash = createHash("sha256");
  let bytes = 0;
  for await (const chunk of createReadStream(path)) {
    bytes += chunk.length;
    hash.update(chunk);
  }
  return { bytes, sha256: hash.digest("hex") };
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function assertOutsideRepository(path) {
  const difference = relative(repo, path);
  requireCondition(
    difference === ".." ||
      difference.startsWith(`..${sep}`) ||
      isAbsolute(difference),
    "Lưu gói sao lưu bên ngoài kho mã nguồn để tránh đưa dữ liệu vào Git.",
  );
}

async function bundlePath(config) {
  const requested = resolve(config.bundle);
  const path =
    config.mode === "backup"
      ? join(
          await realpath(dirname(requested)),
          relative(dirname(requested), requested),
        )
      : await realpath(requested);
  assertOutsideRepository(path);
  return path;
}

async function attachmentVolume(config, name) {
  requireCondition(
    name !== config.volume,
    "Volume đính kèm phải khác volume MySQL.",
  );
  await assertOwnedVolume(config, name, "feedback_attachments");
  const writers = trimLines(
    await docker(config, ["ps", "-q", "--filter", `volume=${name}`]),
  );
  requireCondition(!writers.length, "Volume đính kèm còn container đang chạy.");
  return name;
}

function volumeArgs(config, volume, shell, args = [], write = false) {
  return [
    "run",
    "--rm",
    ...(write ? ["--interactive"] : []),
    "--network",
    "none",
    "--read-only",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--user",
    "1000:1000",
    "--mount",
    `type=volume,src=${volume},dst=/feedback${write ? "" : ",readonly"}`,
    "--entrypoint",
    "sh",
    config.image,
    "-ec",
    shell,
    "sfs-backup",
    ...args,
  ];
}

async function readAttachment(path, expected) {
  const details = await lstat(path);
  requireCondition(
    details.isFile() &&
      !details.isSymbolicLink() &&
      details.size === expected.bytes,
    "Tệp đính kèm thiếu hoặc kích thước khác metadata trong MySQL.",
  );
  const handle = await open(
    path,
    constants.O_RDONLY | (constants.O_NOFOLLOW || 0),
  );
  try {
    const actual = await handle.stat();
    requireCondition(
      actual.isFile() &&
        actual.size === details.size &&
        actual.ino === details.ino &&
        actual.dev === details.dev,
      "Tệp đính kèm thay đổi trong lúc đọc.",
    );
    const bytes = await handle.readFile();
    requireCondition(
      bytes.length === expected.bytes && sha256(bytes) === expected.sha256,
      "Tệp đính kèm không khớp SHA-256 trong MySQL.",
    );
    return bytes;
  } finally {
    await handle.close();
  }
}

async function attachmentLocation(config) {
  if (!config.attachments) return null;
  if (config.attachments.startsWith("volume:")) {
    return {
      volume: await attachmentVolume(
        config,
        config.attachments.slice("volume:".length),
      ),
    };
  }
  const path = resolve(config.attachments);
  if (config.mode === "backup") return { path: await realpath(path) };
  const target = join(
    await realpath(dirname(path)),
    relative(dirname(path), path),
  );
  assertOutsideRepository(target);
  return { path: target };
}

async function exportAttachments(config, directory, attachments, location) {
  if (!attachments.length) return;
  await mkdir(directory, { mode: 0o700 });
  for (const expected of attachments) {
    const output = join(directory, expected.key);
    if (location.path) {
      const data = await readAttachment(
        join(location.path, expected.key),
        expected,
      );
      await writeFile(output, data, { flag: "wx", mode: 0o600 });
    } else {
      const args = volumeArgs(
        config,
        location.volume,
        'test -f "$1" && test ! -L "$1" && test "$(wc -c < "$1")" -eq "$2" && cat -- "$1"',
        [`/feedback/${expected.key}`, String(expected.bytes)],
      );
      await streamDocker(
        config,
        args,
        (child) => {
          child.stdin.end();
          return pipeline(
            child.stdout,
            createWriteStream(output, { flags: "wx", mode: 0o600 }),
          );
        },
        "Không xuất được tệp từ volume đính kèm.",
      );
      await readAttachment(output, expected);
    }
  }
}

async function importAttachments(config, directory, attachments, location) {
  for (const expected of attachments) {
    const data = await readAttachment(join(directory, expected.key), expected);
    if (location.path) {
      await writeFile(join(location.path, expected.key), data, {
        flag: "wx",
        mode: 0o600,
      });
    } else {
      const args = volumeArgs(
        config,
        location.volume,
        'umask 077; set -C; cat > "$1"; sha256sum -- "$1"',
        [`/feedback/${expected.key}`],
        true,
      );
      await streamDocker(
        config,
        args,
        async (child) => {
          const result = (async () => {
            let text = "";
            for await (const chunk of child.stdout)
              text += chunk.toString("utf8");
            requireCondition(
              text.split(/\s+/)[0] === expected.sha256,
              "Tệp đã ghi không khớp SHA-256.",
            );
          })();
          await Promise.all([
            result,
            new Promise((resolve, reject) => {
              child.stdin.once("error", reject);
              child.stdin.end(data, resolve);
            }),
          ]);
        },
        "Không ghi được tệp đính kèm vào volume đích hoặc SHA-256 không khớp.",
      );
    }
  }
}

async function backup(config, path) {
  const schema = await schemaInfo(config);
  const names = await tableNames(config);
  requireCondition(names.length, "Schema nguồn không có bảng để sao lưu.");
  const sourceData = await snapshot(config, names);
  const location = await attachmentLocation(config);
  requireCondition(
    !sourceData.attachments.length || location,
    "Schema có tệp đính kèm. Cần chỉ rõ --attachments.",
  );
  await mkdir(path, { mode: 0o700 });
  const sql = join(path, sqlName);
  try {
    await streamDocker(
      config,
      mysqlArgs(config, "mysqldump", [
        "--single-transaction",
        "--quick",
        "--set-gtid-purged=OFF",
        "--no-tablespaces",
        "--skip-add-drop-table",
        "--skip-add-locks",
        "--skip-disable-keys",
        "--skip-triggers",
        "--hex-blob",
        "--default-character-set=utf8mb4",
        config.database,
      ]),
      (child) => {
        child.stdin.end();
        return pipeline(
          child.stdout,
          createWriteStream(sql, { flags: "wx", mode: 0o600 }),
        );
      },
      "Không tạo được bản xuất MySQL.",
    );
    await exportAttachments(
      config,
      join(path, "attachments"),
      sourceData.attachments,
      location,
    );
    const result = await snapshot(config, await tableNames(config));
    requireCondition(
      JSON.stringify(result) === JSON.stringify(sourceData),
      "Bảng hoặc tệp đính kèm thay đổi trong lúc sao lưu. Dừng toàn bộ tiến trình ghi và thử lại.",
    );
    const manifest = {
      format: 1,
      createdAt: new Date().toISOString(),
      source: {
        engine: config.engine,
        project: config.project,
        database: config.database,
        volume: config.volume,
        ...schema,
      },
      sql: await fileDigest(sql),
      ...sourceData,
    };
    await writeFile(
      join(path, manifestName),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { flag: "wx", mode: 0o600 },
    );
    console.log(
      `Đã sao lưu ${manifest.tables.length} bảng, ${manifest.attachments.length} tệp đính kèm vào ${path}.`,
    );
  } catch (error) {
    throw new Error(
      `${error.message} Gói tạo dở tại ${path} không dùng để khôi phục.`,
    );
  }
}

async function restore(config, path) {
  const manifest = JSON.parse(await readFile(join(path, manifestName), "utf8"));
  requireCondition(
    manifest?.format === 1 &&
      manifest?.source?.engine &&
      manifest?.source?.project &&
      manifest?.source?.volume &&
      manifest?.sql?.bytes > 0 &&
      digestPattern.test(manifest?.sql?.sha256),
    "Manifest không hợp lệ hoặc gói sao lưu chưa hoàn tất.",
  );
  validateSnapshot(manifest.tables, manifest.attachments);
  requireCondition(manifest.tables.length, "Gói sao lưu không có bảng.");
  requireCondition(
    config.project !== manifest.source.project &&
      (config.engine !== manifest.source.engine ||
        config.volume !== manifest.source.volume),
    "Dự án và kho MySQL đích phải tách khỏi bản gốc.",
  );
  const schema = await schemaInfo(config);
  requireCondition(
    schema.version === manifest.source.version &&
      schema.charset === manifest.source.charset &&
      schema.collation === manifest.source.collation,
    "Phiên bản MySQL, bộ mã hoặc collation của đích khác nguồn.",
  );
  requireCondition(
    !(await tableNames(config)).length,
    "Schema đích đã có bảng. Tạo một dự án và volume đích mới.",
  );
  const sql = join(path, sqlName);
  const stats = await lstat(sql);
  requireCondition(
    stats.isFile() && !stats.isSymbolicLink(),
    "Tệp SQL phải là tệp thường.",
  );
  const actual = await fileDigest(sql);
  requireCondition(
    actual.bytes === manifest.sql.bytes &&
      actual.sha256 === manifest.sql.sha256,
    "Tệp SQL không khớp số byte hoặc SHA-256 trong manifest.",
  );
  const location = await attachmentLocation(config);
  requireCondition(
    !manifest.attachments.length || location,
    "Gói có tệp đính kèm. Cần chỉ rõ --attachments ở đích.",
  );
  if (manifest.attachments.length) {
    const directory = join(path, "attachments");
    requireCondition(
      (await lstat(directory)).isDirectory() &&
        !(await lstat(directory)).isSymbolicLink(),
      "Thư mục đính kèm trong gói không hợp lệ.",
    );
    for (const expected of manifest.attachments)
      await readAttachment(join(directory, expected.key), expected);
  }
  if (location?.volume) {
    const entries = (
      await docker(
        config,
        volumeArgs(
          config,
          location.volume,
          "find /feedback -mindepth 1 -print -quit",
        ),
      )
    ).trim();
    requireCondition(!entries, "Volume đính kèm đích đã có dữ liệu.");
  } else if (location?.path) {
    await mkdir(location.path, { mode: 0o700 });
    requireCondition(
      !(await readdir(location.path)).length,
      "Thư mục đính kèm đích phải mới và trống.",
    );
  }
  try {
    await streamDocker(
      config,
      mysqlArgs(
        config,
        "mysql",
        [
          "--binary-mode",
          "--default-character-set=utf8mb4",
          `--database=${config.database}`,
        ],
        true,
      ),
      async (child) => {
        child.stdout.resume();
        await pipeline(createReadStream(sql), child.stdin);
      },
      "MySQL báo lỗi khi nhập SQL.",
    );
    const restored = await snapshot(config, await tableNames(config));
    requireCondition(
      JSON.stringify(restored.tables) === JSON.stringify(manifest.tables) &&
        JSON.stringify(restored.attachments) ===
          JSON.stringify(manifest.attachments),
      "Bảng, số dòng hoặc metadata tệp đính kèm sau nhập khác bản sao lưu.",
    );
    await importAttachments(
      config,
      join(path, "attachments"),
      manifest.attachments,
      location,
    );
    console.log(
      `Đã khôi phục và đối chiếu ${restored.tables.length} bảng, ${restored.attachments.length} tệp đính kèm trong ${config.project}.`,
    );
  } catch (error) {
    throw new Error(
      `${error.message} Đích có thể đã nhập một phần. Giữ lại để kiểm tra và thử trên một đích mới.`,
    );
  }
}

try {
  const config = options(process.argv.slice(2));
  const path = await bundlePath(config);
  const database = await selectDatabase(config);
  if (config.mode === "backup") await backup(database, path);
  else await restore(database, path);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
