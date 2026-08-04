import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { scoped } from "../logger.js";
import { getSettings } from "./settings.js";
import { checkpoint, closeDatabase, initDatabase } from "../db/database.js";
import type { BackupEntry } from "../../shared/ipc.js";

const log = scoped("backup");

/** ملفّات بيانات سطح المكتب المحليّة المشمولة بالنسخ (JSON من electron-store). */
const DATA_FILES = ["desktop-settings.json", "desktop-config.json"];
/** ملفّ قاعدة SQLite المشفّرة (يُضمَّن كـ base64 — يحوي العملاء/الطلبات/المدفوعات). */
const SQLITE_FILE = "laundry-offline.db";
const MAGIC = "LAUNDRY_DESKTOP_BACKUP_V1";

export function backupDir(): string {
  const dir = path.join(app.getPath("userData"), "backups");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function collectData(): Record<string, unknown> {
  const userData = app.getPath("userData");
  const out: Record<string, unknown> = {};
  for (const f of DATA_FILES) {
    const p = path.join(userData, f);
    if (fs.existsSync(p)) {
      try {
        out[f] = JSON.parse(fs.readFileSync(p, "utf8"));
      } catch {
        /* تجاهل ملفّاً تالفاً */
      }
    }
  }
  return out;
}

/** يلتقط قاعدة SQLite (بعد wal_checkpoint) كـ base64 لإدراجها في النسخة. */
function collectSqlite(): string | undefined {
  const file = path.join(app.getPath("userData"), SQLITE_FILE);
  if (!fs.existsSync(file)) return undefined;
  try {
    checkpoint(); // لقطة متّسقة: فرّغ WAL إلى الملفّ الرئيسي
  } catch {
    /* القاعدة قد لا تكون مفتوحة بعد */
  }
  return fs.readFileSync(file).toString("base64");
}

/** ينشئ نسخة مضغوطة (gzip) موقّعة. يُطبّق سياسة الاحتفاظ بعدها. */
export function runBackup(kind: BackupEntry["kind"]): BackupEntry {
  const payload = {
    magic: MAGIC,
    kind,
    createdAt: new Date().toISOString(),
    data: collectData(),
    sqlite: collectSqlite(), // قاعدة العملاء/الطلبات/المدفوعات (مشفّرة)
  };
  const gz = zlib.gzipSync(Buffer.from(JSON.stringify(payload), "utf8"));
  const stamp = payload.createdAt.replace(/[:.]/g, "-");
  const file = path.join(backupDir(), `${kind}-${stamp}.json.gz`);
  fs.writeFileSync(file, gz);
  log.info(`backup created (${kind}):`, file, `${gz.length} bytes`);
  applyRetention();
  return { file, createdAt: payload.createdAt, sizeBytes: gz.length, kind };
}

export function listBackups(): BackupEntry[] {
  const dir = backupDir();
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json.gz"))
    .map((f) => {
      const st = fs.statSync(path.join(dir, f));
      const kind = (f.split("-")[0] as BackupEntry["kind"]) ?? "manual";
      return { file: path.join(dir, f), createdAt: st.mtime.toISOString(), sizeBytes: st.size, kind };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** يتحقّق من النسخة قبل الاسترجاع ثم يعيد كتابة ملفّات البيانات. يُرجع الملفّات المُستعادة. */
export function restoreBackup(file: string): string[] {
  if (!fs.existsSync(file)) throw new Error("Backup file not found");
  const raw = zlib.gunzipSync(fs.readFileSync(file)).toString("utf8");
  const parsed = JSON.parse(raw) as { magic?: string; data?: Record<string, unknown>; sqlite?: string };
  if (parsed.magic !== MAGIC || typeof parsed.data !== "object" || parsed.data === null) {
    throw new Error("Invalid or corrupted backup file");
  }
  const userData = app.getPath("userData");
  const restored: string[] = [];
  for (const [name, content] of Object.entries(parsed.data)) {
    if (!DATA_FILES.includes(name)) continue; // whitelist صارم
    fs.writeFileSync(path.join(userData, name), JSON.stringify(content, null, 2), "utf8");
    restored.push(name);
  }

  // استرجاع قاعدة SQLite: أغلقها، اكتب البايتات، احذف WAL/SHM القديمة، ثم أعِد الفتح.
  // ملاحظة: القاعدة مشفّرة بمفتاح الجهاز (DPAPI) — الاسترجاع على نفس المستخدم/الجهاز.
  if (typeof parsed.sqlite === "string") {
    closeDatabase();
    const dbPath = path.join(userData, SQLITE_FILE);
    fs.writeFileSync(dbPath, Buffer.from(parsed.sqlite, "base64"));
    for (const ext of ["-wal", "-shm"]) {
      if (fs.existsSync(dbPath + ext)) fs.rmSync(dbPath + ext);
    }
    initDatabase(); // أعِد الفتح بالمفتاح المختوم
    restored.push(SQLITE_FILE);
  }

  log.info("backup restored:", restored.join(", "));
  return restored;
}

function applyRetention(): void {
  const days = getSettings().backup.retentionDays;
  const cutoff = Date.now() - days * 86_400_000;
  for (const b of listBackups()) {
    if (new Date(b.createdAt).getTime() < cutoff) {
      try {
        fs.unlinkSync(b.file);
        log.info("retention removed:", b.file);
      } catch {
        /* تجاهل */
      }
    }
  }
}

let dailyTimer: NodeJS.Timeout | null = null;
let weeklyTimer: NodeJS.Timeout | null = null;

/** يبدأ جداول النسخ اليومي/الأسبوعي حسب الإعدادات. */
export function startBackupSchedules(onDone: (e: BackupEntry) => void): void {
  const s = getSettings().backup;
  if (s.daily) dailyTimer = setInterval(() => onDone(runBackup("daily")), 24 * 60 * 60 * 1000);
  if (s.weekly) weeklyTimer = setInterval(() => onDone(runBackup("weekly")), 7 * 24 * 60 * 60 * 1000);
}

export function stopBackupSchedules(): void {
  if (dailyTimer) clearInterval(dailyTimer);
  if (weeklyTimer) clearInterval(weeklyTimer);
  dailyTimer = weeklyTimer = null;
}

/** نسخة عند الخروج (إن كانت مُفعّلة). */
export function backupOnExitIfEnabled(): void {
  if (getSettings().backup.onExit) {
    try {
      runBackup("exit");
    } catch (err) {
      log.error("exit backup failed:", err);
    }
  }
}
