import { connect } from 'cloudflare:sockets'
import { retentionCutoffs } from './retention.js'

const CONSENT_VERSION = 'atlas-launch-notice-v1-2026-08-18'
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }

export default {
  async fetch(request, env) {
    try {
      return await route(request, env)
    } catch (error) {
      console.error('Unhandled form API error', error)
      return json({ ok: false, error: 'temporarily_unavailable' }, 503, request, env)
    }
  },

  async scheduled(_controller, env) {
    const { pendingCutoff, confirmedCutoff, rateCutoff } = retentionCutoffs()
    await env.DB.batch([
      env.DB.prepare("DELETE FROM waitlist WHERE status = 'pending' AND requested_at < ?").bind(pendingCutoff),
      env.DB.prepare("DELETE FROM waitlist WHERE status = 'confirmed' AND confirmed_at < ?").bind(confirmedCutoff),
      env.DB.prepare('DELETE FROM rate_limits WHERE window_started_at < ?').bind(rateCutoff),
    ])
  },
}

async function route(request, env) {
  const url = new URL(request.url)

  if (request.method === 'OPTIONS') return preflight(request, env)
  if (request.method === 'GET' && url.pathname === '/health') {
    return json({ ok: true }, 200, request, env)
  }
  if (request.method === 'GET' && url.pathname === '/api/waitlist/confirm') {
    return confirmWaitlist(url, env)
  }

  if (request.method !== 'POST') return json({ ok: false, error: 'not_found' }, 404, request, env)
  if (!isAllowedOrigin(request, env)) return json({ ok: false, error: 'forbidden' }, 403, request, env)
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return json({ ok: false, error: 'invalid_content_type' }, 415, request, env)
  }

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 12_000) return json({ ok: false, error: 'payload_too_large' }, 413, request, env)

  let body
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'invalid_request' }, 400, request, env)
  }

  if (typeof body.website === 'string' && body.website.trim()) {
    return json({ ok: true }, 200, request, env)
  }

  const turnstileOk = await verifyTurnstile(body.turnstileToken, request, env)
  if (!turnstileOk) return json({ ok: false, error: 'verification_failed' }, 400, request, env)

  if (url.pathname === '/api/contact') return submitContact(body, request, env)
  if (url.pathname === '/api/waitlist') return submitWaitlist(body, request, env)
  return json({ ok: false, error: 'not_found' }, 404, request, env)
}

async function submitContact(body, request, env) {
  const name = cleanSingleLine(body.name, 100)
  const company = cleanSingleLine(body.company, 120)
  const email = normalizeEmail(body.email)
  const message = cleanMultiline(body.message, 1600)
  if (!email || message.length < 2) return json({ ok: false, error: 'invalid_fields' }, 400, request, env)

  const allowed = await consumeRateLimit(env, `contact:${await requestFingerprint(request, env)}`, 5, 60 * 60)
  if (!allowed) return json({ ok: false, error: 'rate_limited' }, 429, request, env)

  const subjectName = name || company || email
  const text = [
    'New Atlas enquiry',
    '',
    `Name: ${name || 'Not provided'}`,
    `Company: ${company || 'Not provided'}`,
    `Reply email: ${email}`,
    '',
    'Project or research goal:',
    message,
  ].join('\n')

  await sendEmail(env, {
    to: env.CONTACT_RECIPIENT,
    subject: `Atlas enquiry from ${subjectName}`.slice(0, 140),
    text,
    replyTo: email,
    replyToName: name || undefined,
  })

  return json({ ok: true }, 200, request, env)
}

async function submitWaitlist(body, request, env) {
  const email = normalizeEmail(body.email)
  if (!email) return json({ ok: false, error: 'invalid_fields' }, 400, request, env)

  const fingerprint = await requestFingerprint(request, env)
  const [ipAllowed, emailAllowed] = await Promise.all([
    consumeRateLimit(env, `waitlist-ip:${fingerprint}`, 5, 60 * 60),
    consumeRateLimit(env, `waitlist-email:${await keyedHash(email, env.TOKEN_SECRET)}`, 2, 24 * 60 * 60),
  ])
  if (!ipAllowed || !emailAllowed) return json({ ok: true }, 200, request, env)

  const existing = await env.DB.prepare('SELECT status FROM waitlist WHERE email = ?').bind(email).first()
  if (existing?.status === 'confirmed') return json({ ok: true }, 200, request, env)

  const token = randomToken()
  const tokenHash = await sha256(token)
  const requestedAt = new Date().toISOString()
  await env.DB.prepare(`
    INSERT INTO waitlist (email, status, confirmation_token_hash, requested_at, confirmed_at, consent_version)
    VALUES (?, 'pending', ?, ?, NULL, ?)
    ON CONFLICT(email) DO UPDATE SET
      status = 'pending', confirmation_token_hash = excluded.confirmation_token_hash,
      requested_at = excluded.requested_at, confirmed_at = NULL, consent_version = excluded.consent_version
  `).bind(email, tokenHash, requestedAt, CONSENT_VERSION).run()

  const apiOrigin = new URL(request.url).origin
  const confirmationUrl = `${apiOrigin}/api/waitlist/confirm?token=${encodeURIComponent(token)}`
  const text = [
    'Confirm your Atlas launch notification',
    '',
    'Someone entered this address to receive one email when Atlas first launches.',
    'Confirm the request by opening this link:',
    confirmationUrl,
    '',
    'If this was not you, ignore this email. The unconfirmed request will be deleted automatically.',
    '',
    'Primis Intelligence UG (haftungsbeschraenkt)',
  ].join('\n')

  try {
    await sendEmail(env, {
      to: email,
      subject: 'Confirm your Atlas launch notification',
      text,
    })
  } catch (error) {
    await env.DB.prepare("DELETE FROM waitlist WHERE email = ? AND status = 'pending'").bind(email).run()
    throw error
  }

  return json({ ok: true }, 200, request, env)
}

async function confirmWaitlist(url, env) {
  const token = url.searchParams.get('token') || ''
  const redirectBase = env.PUBLIC_SITE_URL || 'https://primis3d.com'
  if (!/^[A-Za-z0-9_-]{40,120}$/.test(token)) return Response.redirect(`${redirectBase}/studio?waitlist=invalid`, 303)

  const tokenHash = await sha256(token)
  const record = await env.DB.prepare(`
    SELECT email, requested_at FROM waitlist
    WHERE confirmation_token_hash = ? AND status = 'pending'
  `).bind(tokenHash).first()

  if (!record) return Response.redirect(`${redirectBase}/studio?waitlist=invalid`, 303)
  if (Date.now() - Date.parse(record.requested_at) > 7 * 24 * 60 * 60 * 1000) {
    await env.DB.prepare("DELETE FROM waitlist WHERE confirmation_token_hash = ? AND status = 'pending'").bind(tokenHash).run()
    return Response.redirect(`${redirectBase}/studio?waitlist=expired`, 303)
  }

  await env.DB.prepare(`
    UPDATE waitlist SET status = 'confirmed', confirmed_at = ?, confirmation_token_hash = NULL
    WHERE confirmation_token_hash = ? AND status = 'pending'
  `).bind(new Date().toISOString(), tokenHash).run()
  return Response.redirect(`${redirectBase}/studio?waitlist=confirmed`, 303)
}

async function sendEmail(env, { to, subject, text, replyTo, replyToName }) {
  if (!env.SMTP_USERNAME || !env.SMTP_PASSWORD) throw new Error('IONOS SMTP credentials are not configured')

  const socket = connect(
    { hostname: env.SMTP_HOST || 'smtp.ionos.de', port: Number(env.SMTP_PORT || 465) },
    { secureTransport: 'on', allowHalfOpen: false },
  )
  const smtp = new SmtpSession(socket)
  try {
    await smtp.expect([220])
    await smtp.command(`EHLO ${env.SMTP_EHLO_NAME || 'primis3d.com'}`, [250])
    await smtp.command('AUTH LOGIN', [334])
    await smtp.command(base64Utf8(env.SMTP_USERNAME), [334])
    await smtp.command(base64Utf8(env.SMTP_PASSWORD), [235])
    await smtp.command(`MAIL FROM:<${env.MAIL_FROM_EMAIL}>`, [250])
    await smtp.command(`RCPT TO:<${to}>`, [250, 251])
    await smtp.command('DATA', [354])
    await smtp.data(buildMimeMessage({
      fromEmail: env.MAIL_FROM_EMAIL,
      fromName: env.MAIL_FROM_NAME || 'Primis',
      to,
      subject,
      text,
      replyTo,
      replyToName,
    }), [250])
    await smtp.command('QUIT', [221])
  } finally {
    await smtp.close()
  }
}

class SmtpSession {
  constructor(socket) {
    this.socket = socket
    this.reader = socket.readable.getReader()
    this.writer = socket.writable.getWriter()
    this.decoder = new TextDecoder()
    this.buffer = ''
  }

  async command(value, acceptedCodes) {
    await this.write(`${value}\r\n`)
    return this.expect(acceptedCodes)
  }

  async data(message, acceptedCodes) {
    const normalized = message.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..')
    await this.write(`${normalized}\r\n.\r\n`)
    return this.expect(acceptedCodes)
  }

  async write(value) {
    await this.writer.write(new TextEncoder().encode(value))
  }

  async expect(acceptedCodes) {
    const lines = []
    while (true) {
      const line = await this.readLine()
      lines.push(line)
      const match = /^(\d{3})([ -])/.exec(line)
      if (!match || match[2] === '-') continue
      const code = Number(match[1])
      if (!acceptedCodes.includes(code)) {
        throw new Error(`SMTP command rejected with status ${code}`)
      }
      return { code, lines }
    }
  }

  async readLine() {
    while (!this.buffer.includes('\r\n')) {
      const { value, done } = await this.reader.read()
      if (done) throw new Error('SMTP connection closed unexpectedly')
      this.buffer += this.decoder.decode(value, { stream: true })
      if (this.buffer.length > 32_768) throw new Error('SMTP response exceeded limit')
    }
    const end = this.buffer.indexOf('\r\n')
    const line = this.buffer.slice(0, end)
    this.buffer = this.buffer.slice(end + 2)
    return line
  }

  async close() {
    try { this.writer.releaseLock() } catch {}
    try { this.reader.releaseLock() } catch {}
    try { this.socket.close() } catch {}
  }
}

function buildMimeMessage({ fromEmail, fromName, to, subject, text, replyTo, replyToName }) {
  const headers = [
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@primis3d.com>`,
    `From: ${encodeHeader(fromName)} <${fromEmail}>`,
    `To: <${to}>`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ]
  if (replyTo) headers.splice(4, 0, `Reply-To: ${replyToName ? `${encodeHeader(replyToName)} ` : ''}<${replyTo}>`)
  return `${headers.join('\r\n')}\r\n\r\n${wrapBase64(base64Utf8(text))}`
}

function encodeHeader(value) {
  return `=?UTF-8?B?${base64Utf8(String(value))}?=`
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

async function verifyTurnstile(token, request, env) {
  if (!env.TURNSTILE_SECRET) return env.TURNSTILE_REQUIRED !== 'true'
  if (typeof token !== 'string' || token.length > 2048) return false
  const body = new FormData()
  body.set('secret', env.TURNSTILE_SECRET)
  body.set('response', token)
  const remoteIp = request.headers.get('CF-Connecting-IP')
  if (remoteIp) body.set('remoteip', remoteIp)
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
  if (!response.ok) return false
  const result = await response.json()
  if (result.success !== true) return false
  const allowedHosts = allowedOrigins(env).map(origin => new URL(origin).hostname)
  return typeof result.hostname === 'string' && allowedHosts.includes(result.hostname)
}

async function consumeRateLimit(env, bucket, limit, windowSeconds) {
  const now = Math.floor(Date.now() / 1000)
  const record = await env.DB.prepare(`
    INSERT INTO rate_limits (bucket, count, window_started_at) VALUES (?, 1, ?)
    ON CONFLICT(bucket) DO UPDATE SET
      count = CASE WHEN ? - window_started_at >= ? THEN 1 ELSE count + 1 END,
      window_started_at = CASE WHEN ? - window_started_at >= ? THEN ? ELSE window_started_at END
    RETURNING count
  `).bind(bucket, now, now, windowSeconds, now, windowSeconds, now).first()
  return Number(record?.count || 0) <= limit
}

async function requestFingerprint(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  return keyedHash(ip, env.TOKEN_SECRET)
}

async function keyedHash(value, secret) {
  if (!secret) throw new Error('TOKEN_SECRET is not configured')
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return bytesToHex(new Uint8Array(signature))
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return bytesToHex(new Uint8Array(digest))
}

function bytesToHex(bytes) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function normalizeEmail(value) {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (email.length < 3 || email.length > 254 || /[\r\n]/.test(email)) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null
  return email
}

function cleanSingleLine(value, maxLength) {
  if (typeof value !== 'string') return ''
  return value.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, maxLength)
}

function cleanMultiline(value, maxLength) {
  if (typeof value !== 'string') return ''
  return value.replace(/\0/g, '').replace(/\r\n/g, '\n').trim().slice(0, maxLength)
}

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || 'https://primis3d.com').split(',').map(value => value.trim()).filter(Boolean)
}

function isAllowedOrigin(request, env) {
  const origin = request.headers.get('origin')
  return Boolean(origin && allowedOrigins(env).includes(origin))
}

function corsHeaders(request, env) {
  const origin = request.headers.get('origin')
  if (!origin || !allowedOrigins(env).includes(origin)) return {}
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  }
}

function preflight(request, env) {
  if (!isAllowedOrigin(request, env)) return new Response(null, { status: 403 })
  return new Response(null, { status: 204, headers: corsHeaders(request, env) })
}

function json(body, status, request, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...corsHeaders(request, env),
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })
}
