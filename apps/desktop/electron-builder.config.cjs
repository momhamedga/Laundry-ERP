/**
 * إعداد electron-builder مُشتقّاً من branding.config.json (Phase 15.5).
 *
 * حلّ محلّ electron-builder.yml الذي كان يُصلّب productName و copyright، فلا
 * ينعكس تغيير ملفّ الهوية على المُثبِّت ولا على Publisher في «إضافة/إزالة
 * البرامج». الآن ملفّ الهوية وحده يحكم.
 *
 * ملاحظة: يُقرأ عند بدء التغليف، وسكربت prepare:branding يسبقه دائماً في
 * سلسلة package/dist فيضمن تحديث package.json وbuild/ قبل القراءة.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "..");
const branding = JSON.parse(fs.readFileSync(path.join(ROOT, "branding.config.json"), "utf8"));

const isPlaceholder = (v) => typeof v === "string" && v.startsWith("<<") && v.endsWith(">>");
/** يعيد القيمة الحقيقية أو البديل — لا نكتب "<<اسم الشركة>>" في مُثبِّت عميل. */
const val = (v, fallback) => (!v || isPlaceholder(v) ? fallback : v);

const productName = branding.product.name;
const company = val(branding.company?.name, productName);
const year = new Date().getFullYear();
// نُلحق اسم الشركة فقط إن لم يكن مذكوراً أصلاً — وإلا تكرّر
// ("Copyright © 2026 MidoCode. All Rights Reserved. MidoCode").
const copyrightBase = val(branding.legal?.copyright, `Copyright © ${year}`);
const copyright = copyrightBase.includes(company) ? copyrightBase : `${copyrightBase} ${company}`.trim();

/** اسم الأصل بلا مسافات: ‎${productName} يحوي مسافة فيكسر مطابقة latest.yml ويسبب 404. */
const slug = productName.replace(/\s+/g, "-");

module.exports = {
  appId: val(branding.product?.appId, "com.laundryerp.desktop"),
  productName,
  copyright,

  // ‎.lkey هو الامتداد الوحيد الذي يفتحه العميل فعلاً (ملفّ الترخيص).
  // امتدادات ‎.laundry/.invoice/.receipt أُزيلت في Phase 15.5: كانت مُعلَنة بلا
  // أي معالج في الشيفرة، فالنقر المزدوج عليها كان يفتح البرنامج ويتجاهل الملفّ.
  fileAssociations: [
    {
      ext: "lkey",
      name: `${productName} License`,
      description: `${productName} license file`,
      role: "Editor",
      icon: "build/icon.ico",
    },
  ],

  directories: { output: "release", buildResources: "build" },

  files: ["dist/**/*", "package.json"],

  extraResources: [
    { from: "../../resources/api", to: "api", filter: ["**/*"] },
    { from: "../../resources/renderer", to: "renderer", filter: ["**/*"] },
    { from: "build", to: "build", filter: ["icon.*", "branding.config.json", "build-info.json"] },
  ],

  asar: true,
  compression: "normal",

  // ==================== Windows ====================
  win: {
    target: [
      { target: "nsis", arch: ["x64"] },
      { target: "portable", arch: ["x64"] },
    ],
    icon: "build/icon.ico",
    artifactName: `${slug}-\${version}-\${arch}.\${ext}`,
    // يضمّن الأيقونة وبيانات الإصدار في موارد الـexe عبر rcedit (ProductName /
    // CompanyName / Copyright / Version) — وهي ما يقرأه Explorer وSmartScreen.
    // يتطلّب winCodeSign في الكاش؛ scripts/prepare-wincodesign.mjs يستخرجها
    // مستثنياً darwin/ (روابط macOS تُفشل الاستخراج على Windows).
    signAndEditExecutable: true,
  },

  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: productName,
    // يملأ InstallLocation في «إضافة/إزالة البرامج» (كان فارغاً حتى Phase 15D)
    include: "build/installer.nsh",
    uninstallDisplayName: `${productName} \${version}`,
  },

  portable: { artifactName: `${slug}-\${version}-portable.\${ext}` },

  // ==================== Linux ====================
  linux: {
    target: ["AppImage"],
    category: "Office",
    icon: "build/icon.png",
    artifactName: `${slug}-\${version}.\${ext}`,
  },

  // ==================== macOS (يُبنى على macOS فقط) ====================
  mac: {
    target: ["dmg"],
    category: "public.app-category.business",
    icon: "build/icon.icns",
  },

  // ==================== Updater ====================
  publish: {
    provider: "github",
    owner: val(branding.product?.githubOwner, "momhamedga"),
    repo: val(branding.product?.githubRepo, "Laundry-ERP"),
  },
};
