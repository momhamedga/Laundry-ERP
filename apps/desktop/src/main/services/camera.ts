import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { scoped } from "../logger.js";
import type { CameraCapture, SaveCaptureOptions } from "../../shared/ipc.js";

const log = scoped("camera");

/**
 * حفظ صور الكاميرا محلّياً (Phase 11.6D). الالتقاط الفعلي يتمّ في الواجهة عبر
 * getUserMedia → canvas → dataURL (يتطلّب كاميرا فعلية)؛ هنا نُثبّت الصورة على
 * القرص ونربطها بكيان (طلب/عميل) لاستخدامها في الفواتير/الإثبات. مسار الحفظ قابل
 * للاختبار بلا عتاد؛ تدفّق الكاميرا الحيّ يتطلّب جهازاً.
 */

const DATA_URL_RE = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/;

function capturesDir(): string {
  const dir = path.join(app.getPath("userData"), "captures");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function extFromMime(mime: string): string {
  if (mime === "jpeg" || mime === "jpg") return "jpg";
  if (mime === "webp") return "webp";
  return "png";
}

/** يفكّ data URL لصورة ويحفظها على القرص، ويعيد المسار والحجم. */
export function saveCapture(opts: SaveCaptureOptions): CameraCapture {
  const m = DATA_URL_RE.exec(opts?.dataUrl ?? "");
  if (!m) throw new Error("invalid image data URL");
  const ext = extFromMime(m[1]!);
  const buf = Buffer.from(m[2]!, "base64");
  if (buf.length === 0) throw new Error("empty image data");

  const safeTag = (opts.tag ?? "capture").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "capture";
  const name = `${safeTag}_${Date.now()}.${ext}`;
  const file = path.join(capturesDir(), name);
  fs.writeFileSync(file, buf);
  log.info(`saved capture ${name} (${buf.length} bytes)`);
  return { file, name, sizeBytes: buf.length, createdAt: new Date().toISOString() };
}

/** يسرد الصور المحفوظة (الأحدث أولاً). */
export function listCaptures(): CameraCapture[] {
  const dir = capturesDir();
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter((n) => /\.(png|jpe?g|webp)$/i.test(n))
    .map((n) => {
      const file = path.join(dir, n);
      const st = fs.statSync(file);
      return { file, name: n, sizeBytes: st.size, createdAt: st.mtime.toISOString() };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
