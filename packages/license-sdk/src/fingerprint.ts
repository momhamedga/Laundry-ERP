import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import type { FingerprintComponents, MachineFingerprint } from "./types.js";

/**
 * بصمة الجهاز (Phase 15B).
 *
 * تُجمع خمسة مكوّنات مستقلة وتُهَشَّم **كل واحد على حدة**، لأن المطابقة لاحقاً
 * بالنقاط (3 من 5): تبديل قرص أو إعادة تثبيت ويندوز يجب ألا يكسر ترخيص العميل،
 * بينما نقل الترخيص إلى جهاز آخر بالكامل يجب أن يفشل.
 *
 * الاستقرار: كل المصادر ثابتة عبر إعادة التشغيل. الأكثر تقلّباً هو machineGuid
 * (يتغيّر بإعادة تثبيت ويندوز) وdiskSerial (يتغيّر بتبديل القرص) — ولهذا لا
 * نعتمد على أيٍّ منهما منفرداً.
 */

/** يشغّل PowerShell ويعيد المخرجات نصّاً (فارغ عند الفشل — لا يرمي). */
function ps(command: string): string {
  try {
    const out = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", command],
      { encoding: "utf8", timeout: 15000, windowsHide: true },
    );
    return out.trim();
  } catch {
    return "";
  }
}

/** ينظّف القيم العديمة الفائدة التي تضعها بعض اللوحات (To be filled...). */
function clean(value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (/^0+$/.test(v.replace(/[-\s]/g, ""))) return "";
  if (/to be filled|default string|none|n\/?a|system serial/i.test(v)) return "";
  return v;
}

/** يقرأ المكوّنات الخام من نظام التشغيل. */
export function readComponents(): FingerprintComponents {
  if (process.platform !== "win32") {
    // منصّات أخرى: نُبقي الواجهة نفسها بقيم فارغة بدل الانهيار
    return { machineGuid: "", systemUuid: "", baseboardSerial: "", cpuId: "", diskSerial: "" };
  }
  return {
    machineGuid: clean(
      ps("(Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Cryptography' -Name MachineGuid).MachineGuid"),
    ),
    systemUuid: clean(ps("(Get-CimInstance Win32_ComputerSystemProduct).UUID")),
    baseboardSerial: clean(ps("(Get-CimInstance Win32_BaseBoard).SerialNumber")),
    cpuId: clean(ps("(Get-CimInstance Win32_Processor | Select-Object -First 1).ProcessorId")),
    diskSerial: clean(
      ps(
        "(Get-CimInstance Win32_DiskDrive | Where-Object {$_.MediaType -match 'Fixed'} | Select-Object -First 1).SerialNumber",
      ),
    ),
  };
}

const sha256 = (s: string): string => crypto.createHash("sha256").update(s, "utf8").digest("hex");

/** يصوغ معرّفاً معروضاً ثابتاً بالشكل LAU-XXXX-XXXX-XXXX من الهاش الكامل. */
export function formatMachineId(fullHash: string): string {
  const s = fullHash.toUpperCase().replace(/[^0-9A-F]/g, "");
  return `LAU-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

/**
 * يبني البصمة الكاملة. كل مكوّن يُهَشَّم مع بادئة اسمه لمنع تبادل القيم بين
 * الحقول، والهاش الكامل يُبنى من المكوّنات مرتّبة لضمان الثبات.
 */
export function getMachineFingerprint(components = readComponents()): MachineFingerprint {
  const keys = Object.keys(components).sort() as (keyof FingerprintComponents)[];
  const hashed = {} as Record<keyof FingerprintComponents, string>;
  for (const k of keys) {
    const raw = components[k];
    // مكوّن غائب يبقى سلسلة فارغة كي لا يُطابِق مكوّناً غائباً آخر لاحقاً
    hashed[k] = raw ? sha256(`${k}:${raw.toUpperCase()}`) : "";
  }
  const fullHash = sha256(keys.map((k) => `${k}=${hashed[k]}`).join("|"));
  return { machineId: formatMachineId(fullHash), fullHash, components: hashed };
}

/**
 * يقارن بصمتين ويعيد عدد المكوّنات المتطابقة (0..5).
 * المكوّنات الفارغة على أي من الطرفين لا تُحتسب مطابقة — حتى لا يرفع جهازٌ
 * تنقصه المعلومات نتيجته مجّاناً.
 */
export function scoreMatch(
  a: Record<keyof FingerprintComponents, string>,
  b: Record<keyof FingerprintComponents, string>,
): number {
  const keys = Object.keys(a) as (keyof FingerprintComponents)[];
  let score = 0;
  for (const k of keys) {
    if (a[k] && b[k] && a[k] === b[k]) score++;
  }
  return score;
}

/** عدد المكوّنات المتاحة فعليّاً على هذا الجهاز (لتشخيص الدعم الفني). */
export function availableComponentCount(
  components: Record<keyof FingerprintComponents, string>,
): number {
  return Object.values(components).filter(Boolean).length;
}
