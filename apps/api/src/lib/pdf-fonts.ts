import {
  CAIRO_ARABIC_WOFF2_BASE64,
  CAIRO_LATIN_WOFF2_BASE64,
} from "../assets/cairo-font.generated.js";

/**
 * خطّ مستندات الـPDF، مضمَّن داخل الصفحة نفسها.
 *
 * كانت القوالب تطلب `"Segoe UI", Tahoma, Arial` — وثلاثتها خطوط Windows. على
 * جهاز التطوير تُصيَّر الفاتورة سليمة، وعلى حاوية Linux في الإنتاج لا يوجد أيٌّ
 * منها فيقع النصّ على بديل بلا تغطية عربية، فتخرج كل الحروف العربية مربّعات
 * فارغة بينما تبقى الأرقام واللاتيني سليمة. عطلٌ لا يظهر محلياً إطلاقاً.
 *
 * التضمين بـbase64 لا الاعتماد على خطّ مثبَّت بالنظام ولا على شبكة وقت التصيير:
 * الفاتورة مستند رسمي يجب أن يخرج بالشكل نفسه أياً كان مكان توليدها، وتطبيق
 * سطح المكتب يولّدها وهو مقطوع عن الإنترنت.
 *
 * الملف متغيّر (variable) فيغطّي 400–700 من مصدر واحد لكل نطاق محارف.
 */
export const PDF_FONT_FACE_CSS = `
  @font-face {
    font-family: "Cairo";
    font-style: normal;
    font-weight: 400 700;
    font-display: block;
    src: url(data:font/woff2;base64,${CAIRO_ARABIC_WOFF2_BASE64}) format("woff2");
    unicode-range: U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0897-08E1,
      U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74,
      U+FE76-FEFC;
  }
  @font-face {
    font-family: "Cairo";
    font-style: normal;
    font-weight: 400 700;
    font-display: block;
    src: url(data:font/woff2;base64,${CAIRO_LATIN_WOFF2_BASE64}) format("woff2");
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA,
      U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193,
      U+2212, U+2215, U+FEFF, U+FFFD;
  }
`;

/**
 * مكدّس الخطوط للمستندات. البدائل بعد Cairo احتياط لو تعذّر تحميل المضمَّن،
 * وتشمل خطوطاً موجودة على Linux (Noto/DejaVu) لا خطوط Windows وحدها.
 */
export const PDF_FONT_STACK = `"Cairo", "Noto Sans Arabic", "Segoe UI", Tahoma, "DejaVu Sans", Arial, sans-serif`;
