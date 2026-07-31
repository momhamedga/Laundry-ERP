import { app, safeStorage } from "electron";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { scoped } from "../logger.js";

const log = scoped("db-key");

/**
 * مفتاح تشفير قاعدة SQLite المحلّية (Phase v1.3.0).
 * يُولَّد مرّة واحدة (256-بت عشوائي)، ويُختَم عبر safeStorage — الذي يستخدم DPAPI على
 * ويندوز / Keychain على macOS / libsecret على Linux — ويُخزَّن كملفّ مختوم في userData.
 * لا يُكتب المفتاح الخام على القرص إطلاقاً عندما يكون safeStorage متاحاً.
 */
export function getOrCreateDbKey(): string {
  const keyFile = path.join(app.getPath("userData"), "db.key");
  const available = safeStorage.isEncryptionAvailable();

  if (fs.existsSync(keyFile)) {
    const sealed = fs.readFileSync(keyFile);
    if (available) return safeStorage.decryptString(sealed);
    return sealed.toString("utf8"); // fallback: بيئة بلا OS keystore
  }

  const key = crypto.randomBytes(32).toString("hex"); // 256-بت
  const data = available ? safeStorage.encryptString(key) : Buffer.from(key, "utf8");
  fs.writeFileSync(keyFile, data, { mode: 0o600 });
  log.info(`db encryption key created (sealed by OS keystore=${available})`);
  return key;
}
