export const confirmationSubject = "Savvy 已收到你的測試報名";
const received = "謝謝你報名試用 Savvy！我們已收到你的報名。";
const next = "開放試用時，我們會寄信給你，附上加入方式。";
const english = "We’ve received your Savvy beta signup. We’ll email you when testing opens.";

export const confirmationText = `${confirmationSubject}\n\n${received}\n${next}\n\n${english}\n\n— Savvy`;

export function confirmationHtml(image = "cid:savvy-sakura") {
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f1ff;color:#211744;font:16px/1.65 Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f1ff">
    <tr><td align="center" style="padding:32px 14px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#fff;border:2px solid #211744;border-radius:18px;box-shadow:5px 6px 0 #c9b8fe">
        <tr><td align="center" bgcolor="#f4f1ff" style="padding:22px 16px 0;border-radius:16px 16px 0 0">
          <span style="font-size:23px;font-weight:bold;color:#5141ba">Savvy</span>
          <img src="${image}" width="180" height="109" alt="" style="display:block;margin:5px auto 10px">
        </td></tr>
        <tr><td style="padding:22px 26px 28px">
          <h1 style="font-size:26px;line-height:1.3;margin:0 0 16px;color:#211744">已收到你的測試報名</h1>
          <p style="margin:0 0 10px">${received}</p>
          <p style="margin:0 0 18px">${next}</p>
          <p lang="en" style="border-top:1px solid #dfd7ff;padding-top:14px;margin:0 0 18px;font-size:14px;color:#554b73">${english}</p>
          <p style="margin:0;font-weight:bold">— Savvy</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
