import type { InvoiceEmailData, PasswordResetEmailData } from "./email.types.js";

const APP_NAME = "Laundry ERP";

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

/** قالب HTML+Text لإعادة تعيين كلمة المرور - عربي RTL، زر أساسي + رابط احتياطي + تحذير أمني */
export function buildPasswordResetEmail(data: PasswordResetEmailData): EmailContent {
  const { resetUrl, expiresInMinutes } = data;
  const subject = `إعادة تعيين كلمة المرور - ${APP_NAME}`;

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Tahoma,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background-color:#0f172a;padding:24px 32px;text-align:center;">
                <span style="color:#ffffff;font-size:20px;font-weight:bold;">${APP_NAME}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;text-align:right;">
                <h1 style="margin:0 0 16px;font-size:18px;color:#0f172a;">طلب إعادة تعيين كلمة المرور</h1>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#475569;">
                  وصلنا طلب لإعادة تعيين كلمة المرور الخاصة بحسابك. اضغط على الزر أدناه لاختيار كلمة مرور جديدة.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                  <tr>
                    <td style="border-radius:8px;background-color:#0f172a;">
                      <a href="${resetUrl}" style="display:inline-block;padding:12px 32px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">
                        إعادة تعيين كلمة المرور
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;font-size:13px;color:#64748b;">
                  إذا لم يعمل الزر، انسخ الرابط التالي والصقه بالمتصفح:
                </p>
                <p style="margin:0 0 24px;font-size:13px;word-break:break-all;">
                  <a href="${resetUrl}" style="color:#2563eb;">${resetUrl}</a>
                </p>
                <p style="margin:0 0 8px;font-size:13px;color:#64748b;">
                  ينتهي صلاحية هذا الرابط خلال <strong>${expiresInMinutes} دقيقة</strong>.
                </p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
                <p style="margin:0;font-size:12px;color:#94a3b8;">
                  إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذا البريد ولن يتغير شيء بحسابك.
                  لا تُشارك هذا الرابط مع أي شخص.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `${subject}

وصلنا طلب لإعادة تعيين كلمة المرور الخاصة بحسابك.

افتح هذا الرابط لاختيار كلمة مرور جديدة:
${resetUrl}

ينتهي صلاحية هذا الرابط خلال ${expiresInMinutes} دقيقة.

إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذا البريد ولن يتغير شيء بحسابك.`;

  return { subject, html, text };
}

/** قالب HTML+Text لإرسال فاتورة - عربي RTL، نفس هيكل قالب استعادة كلمة السر - PDF يُرفَق خارج هذا القالب */
export function buildInvoiceEmail(data: InvoiceEmailData): EmailContent {
  const { companyName, invoiceNumber, orderNumber, customerName, totalFormatted, statusLabel } = data;
  const subject = `فاتورة رقم ${invoiceNumber} - ${companyName}`;

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Tahoma,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background-color:#0f172a;padding:24px 32px;text-align:center;">
                <span style="color:#ffffff;font-size:20px;font-weight:bold;">${companyName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;text-align:right;">
                <h1 style="margin:0 0 16px;font-size:18px;color:#0f172a;">فاتورة رقم ${invoiceNumber}</h1>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569;">
                  مرحباً ${customerName}، مرفق مع هذا البريد فاتورتك بصيغة PDF.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                  <tr>
                    <td style="padding:10px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;">رقم الطلب</td>
                    <td style="padding:10px 16px;font-size:13px;color:#0f172a;font-weight:bold;border-bottom:1px solid #e2e8f0;text-align:left;" dir="ltr">${orderNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;">الإجمالي</td>
                    <td style="padding:10px 16px;font-size:13px;color:#0f172a;font-weight:bold;border-bottom:1px solid #e2e8f0;text-align:left;" dir="ltr">${totalFormatted}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;font-size:13px;color:#64748b;">الحالة</td>
                    <td style="padding:10px 16px;font-size:13px;color:#0f172a;font-weight:bold;text-align:left;">${statusLabel}</td>
                  </tr>
                </table>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
                <p style="margin:0;font-size:12px;color:#94a3b8;">
                  إذا كانت لديك أي استفسارات بخصوص هذه الفاتورة، تواصل معنا مباشرة.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `${subject}

مرحباً ${customerName}، مرفق مع هذا البريد فاتورتك بصيغة PDF.

رقم الطلب: ${orderNumber}
الإجمالي: ${totalFormatted}
الحالة: ${statusLabel}

إذا كانت لديك أي استفسارات بخصوص هذه الفاتورة، تواصل معنا مباشرة.`;

  return { subject, html, text };
}
