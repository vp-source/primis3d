export function buildWaitlistConfirmationEmail(confirmationUrl) {
  const safeUrl = escapeHtml(confirmationUrl)
  const text = [
    'Confirm your place on the Atlas launch list',
    '',
    'You are one step away.',
    'Confirm this email address and Primis will notify you once, when the first public Atlas release is ready.',
    '',
    `Confirm your email: ${confirmationUrl}`,
    '',
    'This link expires in seven days. If you did not request this, ignore this email and nothing will be added.',
    '',
    'Primis Intelligence UG (haftungsbeschraenkt)',
    'primis3d.com',
  ].join('\n')

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Confirm your place on the Atlas launch list</title>
</head>
<body style="margin:0;padding:0;background:#ebe8e3;color:#1b1718;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Confirm your email for one Atlas launch notification.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#ebe8e3;">
    <tr>
      <td align="center" style="padding:44px 18px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#151112;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:28px 34px;border-bottom:1px solid #312829;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td valign="middle" style="width:38px;">
                    <img src="https://primis3d.com/assets/primis-logo-exact.png" width="30" height="30" alt="" style="display:block;width:30px;height:30px;border:0;border-radius:5px;">
                  </td>
                  <td valign="middle" style="color:#f4efea;font-size:18px;font-weight:600;letter-spacing:-0.2px;">Primis</td>
                  <td valign="middle" align="right" style="color:#cf756b;font-size:10px;font-weight:700;letter-spacing:1.5px;">ATLAS</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:66px 56px 58px;">
              <div style="margin:0 0 22px;color:#cf756b;font-size:10px;font-weight:700;letter-spacing:2px;">EARLY ACCESS</div>
              <h1 style="margin:0 0 24px;color:#f4efea;font-family:Georgia,'Times New Roman',serif;font-size:48px;font-weight:400;line-height:1.02;letter-spacing:-1.8px;">You are one<br>step away.</h1>
              <p style="max-width:430px;margin:0 0 34px;color:#aaa09c;font-size:15px;line-height:1.65;">Confirm this email address and we&rsquo;ll notify you once, when the first public Atlas release is ready.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td bgcolor="#cf756b" style="border-radius:999px;">
                    <a href="${safeUrl}" style="display:inline-block;padding:16px 25px;color:#1a1112;font-size:13px;font-weight:700;text-decoration:none;border-radius:999px;">Confirm my email&nbsp;&nbsp;&rarr;</a>
                  </td>
                </tr>
              </table>
              <p style="margin:25px 0 0;color:#706865;font-size:11px;line-height:1.55;">Requested on primis3d.com &middot; This link expires in seven days.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 56px 30px;border-top:1px solid #312829;color:#756d69;font-size:10px;line-height:1.6;">
              If you didn&rsquo;t request this, you can ignore the email. Nothing will be added.<br>
              Primis Intelligence UG (haftungsbeschr&auml;nkt) &middot; <a href="https://primis3d.com/privacy" style="color:#9b918d;text-decoration:underline;">Privacy</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { text, html }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
