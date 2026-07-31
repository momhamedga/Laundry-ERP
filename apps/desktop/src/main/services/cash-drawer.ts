import net from "node:net";
import { scoped } from "../logger.js";
import type { CashDrawerOptions } from "../../shared/ipc.js";

const log = scoped("cash-drawer");

/**
 * أمر فتح درج الكاش القياسي (ESC/POS): ESC p m t1 t2
 * m = رقم النبضة (0 → pin 2، 1 → pin 5)، t1/t2 مدّة النبضة.
 */
function kickCommand(pin: 2 | 5): Buffer {
  const m = pin === 5 ? 1 : 0;
  return Buffer.from([0x1b, 0x70, m, 0x19, 0xfa]);
}

/**
 * يفتح درج الكاش عبر طابعة الإيصالات. الطابعات الشبكية: نبضة عبر المنفذ الخام (9100).
 * ⚠️ درج USB يُفتح عادةً بإلحاق أمر النبضة بإيصال الطباعة (لا منفذ خام مباشر على
 * Windows) - يُهيّأ من الإعدادات. الكود جاهز؛ يتطلّب عتاداً فعلياً للتحقق (غير مُختبَر هنا).
 */
export function openCashDrawer(opts: CashDrawerOptions): Promise<void> {
  const cmd = kickCommand(opts.pin ?? 2);
  const host = opts.host;
  if (!host) {
    return Promise.reject(
      new Error("Cash drawer without a network host: send the kick appended to the receipt print (USB)"),
    );
  }
  const port = opts.port ?? 9100;
  return new Promise<void>((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(4000);
    socket.once("error", reject);
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error("Cash drawer timeout"));
    });
    socket.connect(port, host, () => {
      socket.write(cmd, () => socket.end(() => {
        log.info("cash drawer kick sent to", `${host}:${port}`);
        resolve();
      }));
    });
  });
}
