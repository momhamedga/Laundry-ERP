/**
 * يحوّل وثائق Markdown العربية إلى PDF (Phase 15C).
 *
 * يستخدم محرّك Chromium داخل Electron (printToPDF) — لا خدمة خارجية ولا اتصال
 * بأي شبكة، والخطوط العربية تُرسم بمحرّك النظام نفسه الذي يرسم واجهة البرنامج.
 *
 * التشغيل:
 *   apps/desktop/node_modules/.bin/electron tools/build-docs-pdf.cjs
 */
const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DOCS = path.join(ROOT, "docs");
const OUT = path.join(DOCS, "pdf");

/** الوثائق التي تُسلَّم للعميل. */
const TARGETS = ["USER_MANUAL", "ACTIVATION_GUIDE", "SUPPORT_GUIDE", "RELEASE_NOTES"];

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

/**
 * مُحوّل Markdown مُصغَّر يغطّي ما تستعمله وثائقنا فعلاً: عناوين، جداول، قوائم،
 * اقتباسات، شيفرة، غامق، روابط. لا نضيف تبعية ثقيلة لأربع وثائق.
 */
function mdToHtml(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let inCode = false, inTable = false, listType = null;

  const closeList = () => { if (listType) { out.push(`</${listType}>`); listType = null; } };
  const closeTable = () => { if (inTable) { out.push("</tbody></table>"); inTable = false; } };

  const inline = (t) =>
    esc(t)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href=\"$2\">$1</a>");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^```/.test(line)) {
      closeList(); closeTable();
      out.push(inCode ? "</code></pre>" : "<pre><code>");
      inCode = !inCode;
      continue;
    }
    if (inCode) { out.push(esc(line)); continue; }

    if (/^\s*$/.test(line)) { closeList(); closeTable(); continue; }

    if (/^---+$/.test(line)) { closeList(); closeTable(); out.push("<hr/>"); continue; }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      closeList(); closeTable();
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
      continue;
    }

    // جدول: صفّ يبدأ وينتهي بـ |
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const cells = line.trim().slice(1, -1).split("|").map((c) => c.trim());
      const next = lines[i + 1] ?? "";
      if (!inTable && /^\s*\|[\s:|-]+\|\s*$/.test(next)) {
        closeList();
        out.push("<table><thead><tr>" + cells.map((c) => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>");
        inTable = true;
        i++; // تخطّي سطر المحاذاة
        continue;
      }
      if (inTable) {
        out.push("<tr>" + cells.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>");
        continue;
      }
    }
    closeTable();

    if (/^>\s?/.test(line)) {
      closeList();
      out.push(`<blockquote>${inline(line.replace(/^>\s?/, ""))}</blockquote>`);
      continue;
    }

    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ol || ul) {
      const want = ol ? "ol" : "ul";
      if (listType !== want) { closeList(); out.push(`<${want}>`); listType = want; }
      out.push(`<li>${inline((ol ?? ul)[1])}</li>`);
      continue;
    }
    closeList();

    out.push(`<p>${inline(line)}</p>`);
  }
  closeList(); closeTable();
  if (inCode) out.push("</code></pre>");
  return out.join("\n");
}

function wrap(title, bodyHtml, version) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/>
<style>
  @page { margin: 18mm 16mm; }
  body{font-family:'Segoe UI','Tahoma','Arial',sans-serif;font-size:11.5pt;line-height:1.85;
    color:#1a1a1a;margin:0}
  h1{font-size:21pt;border-bottom:3px solid #4f46e5;padding-bottom:9px;margin:0 0 20px;color:#1e1b4b}
  h2{font-size:15.5pt;margin:24px 0 10px;color:#312e81;border-bottom:1px solid #ddd;padding-bottom:5px}
  h3{font-size:13pt;margin:18px 0 7px;color:#3730a3}
  p{margin:7px 0}
  ul,ol{margin:7px 0;padding-inline-start:24px}
  li{margin:4px 0}
  code{background:#f1f3f9;padding:1.5px 5px;border-radius:3px;font-family:Consolas,monospace;font-size:10pt;
    direction:ltr;display:inline-block}
  pre{background:#f7f8fc;border:1px solid #e2e6f0;border-radius:6px;padding:11px;overflow:hidden;
    direction:ltr;text-align:left;page-break-inside:avoid}
  pre code{background:none;padding:0;font-size:9.5pt;line-height:1.5}
  blockquote{border-inline-start:4px solid #4f46e5;background:#f5f6fb;margin:11px 0;
    padding:9px 14px;border-radius:0 6px 6px 0;page-break-inside:avoid}
  blockquote p{margin:0}
  table{width:100%;border-collapse:collapse;margin:12px 0;font-size:10.5pt;page-break-inside:avoid}
  th,td{border:1px solid #d8dce8;padding:7px 9px;text-align:right;vertical-align:top}
  th{background:#eef0f8;font-weight:700;color:#1e1b4b}
  tr:nth-child(even) td{background:#fafbfe}
  hr{border:none;border-top:1px solid #e2e6f0;margin:22px 0}
  a{color:#4f46e5;text-decoration:none}
  h1,h2,h3{page-break-after:avoid}
</style></head><body>
${bodyHtml}
<hr/>
<p style="text-align:center;color:#8b95ad;font-size:9pt">Laundry ERP v${version} — ${title}</p>
</body></html>`;
}

app.whenReady().then(async () => {
  const version = JSON.parse(fs.readFileSync(path.join(ROOT, "branding.config.json"), "utf8")).product.version;
  fs.mkdirSync(OUT, { recursive: true });

  const win = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });

  let made = 0;
  for (const name of TARGETS) {
    const src = path.join(DOCS, `${name}.md`);
    if (!fs.existsSync(src)) {
      console.log(`  تخطّي (غير موجود): ${name}.md`);
      continue;
    }
    const md = fs.readFileSync(src, "utf8");
    const title = (md.match(/^#\s+(.*)$/m) ?? [, name])[1];
    const html = wrap(title, mdToHtml(md), version);

    await win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
    // مهلة قصيرة لضمان اكتمال تخطيط الخطوط العربية قبل الطباعة
    await new Promise((r) => setTimeout(r, 350));

    const pdf = await win.webContents.printToPDF({
      pageSize: "A4",
      printBackground: true,
      margins: { marginType: "default" },
      generateDocumentOutline: true,
    });
    const dest = path.join(OUT, `${name}.pdf`);
    fs.writeFileSync(dest, pdf);
    console.log(`  ✓ ${name}.pdf  (${(pdf.length / 1024).toFixed(0)} KB)`);
    made++;
  }

  console.log(`\n✓ ${made} ملفّ PDF في ${OUT}\n`);
  win.destroy();
  app.exit(0);
}).catch((err) => {
  console.error("FATAL:", err);
  app.exit(1);
});
