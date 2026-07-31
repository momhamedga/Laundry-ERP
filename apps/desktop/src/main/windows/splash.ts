import { BrowserWindow } from "electron";

/**
 * شاشة بداية خفيفة (frameless) تُعرض فوراً أثناء إقلاع الـ API والـ renderer،
 * فيبدو الإقلاع سريعاً. HTML مضمّن (data URL) - لا ملفّات خارجية ولا شبكة.
 */
const SPLASH_HTML = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/>
<style>
  :root{color-scheme:light dark}
  html,body{margin:0;height:100%;font-family:'Cairo',system-ui,sans-serif;
    background:#0b1020;color:#e7ecf5;overflow:hidden}
  .wrap{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px}
  .logo{width:64px;height:64px;border-radius:16px;
    background:linear-gradient(135deg,#4f46e5,#3b82f6);
    display:flex;align-items:center;justify-content:center;font-size:30px;
    box-shadow:0 10px 40px rgba(79,70,229,.45)}
  .title{font-size:18px;font-weight:700;letter-spacing:.3px}
  .sub{font-size:13px;color:#8b95ad}
  .bar{width:180px;height:4px;border-radius:9999px;background:#1c2338;overflow:hidden}
  .bar>i{display:block;height:100%;width:40%;border-radius:9999px;
    background:linear-gradient(90deg,#4f46e5,#3b82f6);animation:load 1.1s infinite ease-in-out}
  @keyframes load{0%{transform:translateX(-120%)}100%{transform:translateX(320%)}}
</style></head><body><div class="wrap">
  <div class="logo">🧺</div>
  <div class="title">نظام إدارة المغاسل</div>
  <div class="sub" id="msg">جارٍ تشغيل النظام…</div>
  <div class="bar"><i></i></div>
</div></body></html>`;

export function createSplashWindow(): BrowserWindow {
  const splash = new BrowserWindow({
    width: 420,
    height: 300,
    frame: false,
    resizable: false,
    movable: true,
    center: true,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: "#0b1020",
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  void splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(SPLASH_HTML)}`);
  splash.once("ready-to-show", () => splash.show());
  return splash;
}
