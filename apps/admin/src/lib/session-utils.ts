/**
 * استخلاص Device/Browser/OS من userAgent الخام الذي يعيده الخادم فعلياً
 * (لا حقول منفصلة بالخادم لهذه القيم) - Regex بسيط بلا مكتبة خارجية،
 * بنفس فلسفة computePasswordStrength بمرحلة Change Password.
 */
export interface ParsedUserAgent {
  browser: string;
  os: string;
  device: "Desktop" | "Mobile" | "Tablet" | "Unknown";
}

const UNKNOWN: ParsedUserAgent = { browser: "غير معروف", os: "غير معروف", device: "Unknown" };

function detectBrowser(ua: string): string {
  if (/EdgA?\//.test(ua)) return "Microsoft Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Version\/.*Safari\//.test(ua)) return "Safari";
  if (/MSIE|Trident/.test(ua)) return "Internet Explorer";
  return "متصفح غير معروف";
}

function detectOs(ua: string): string {
  if (/Windows NT/.test(ua)) return "Windows";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Android/.test(ua)) return "Android";
  if (/Linux/.test(ua)) return "Linux";
  return "نظام غير معروف";
}

function detectDevice(ua: string): ParsedUserAgent["device"] {
  if (/iPad|Tablet(?!.*Mobile)/.test(ua)) return "Tablet";
  if (/Mobi|iPhone|Android.*Mobile/.test(ua)) return "Mobile";
  if (ua.length > 0) return "Desktop";
  return "Unknown";
}

export function parseUserAgent(userAgent: string | null): ParsedUserAgent {
  if (!userAgent) return UNKNOWN;
  return {
    browser: detectBrowser(userAgent),
    os: detectOs(userAgent),
    device: detectDevice(userAgent),
  };
}
