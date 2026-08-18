export function buildMimeMessage({ fromEmail, fromName, to, subject, text, replyTo, replyToName }) {
  const asciiBody = isAscii(text)
  const headers = [
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@primis3d.com>`,
    `From: ${encodeHeader(fromName)} <${fromEmail}>`,
    `To: <${to}>`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    `Content-Transfer-Encoding: ${asciiBody ? '7bit' : 'base64'}`,
  ]
  if (replyTo) headers.splice(4, 0, `Reply-To: ${replyToName ? `${encodeHeader(replyToName)} ` : ''}<${replyTo}>`)
  const body = asciiBody ? normalizeCrlf(text) : wrapBase64(base64Utf8(text))
  return `${headers.join('\r\n')}\r\n\r\n${body}`
}

export function encodeHeader(value) {
  const header = String(value)
  if (/^[\x20-\x7e]*$/.test(header)) return header
  return `=?UTF-8?B?${base64Utf8(header)}?=`
}

function isAscii(value) {
  return /^[\x00-\x7f]*$/.test(String(value))
}

function normalizeCrlf(value) {
  return String(value).replace(/\r?\n/g, '\r\n')
}

function base64Utf8(value) {
  const bytes = new TextEncoder().encode(String(value))
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return btoa(binary)
}

function wrapBase64(value) {
  return value.match(/.{1,76}/g)?.join('\r\n') || ''
}
