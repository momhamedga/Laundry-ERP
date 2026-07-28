/** تنسيقات خاصة بالنسخ الاحتياطي - حجم الملف والمدة */

export function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toLocaleString("ar-EG", { maximumFractionDigits: 1 })} ${units[unit]}`;
}

export function formatDuration(ms: number | null): string {
  if (ms === null || ms === 0) return "—";
  if (ms < 1000) return `${ms} م.ث`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toLocaleString("ar-EG", { maximumFractionDigits: 1 })} ث`;
  const minutes = Math.floor(seconds / 60);
  const rem = Math.round(seconds % 60);
  return `${minutes} د ${rem} ث`;
}
