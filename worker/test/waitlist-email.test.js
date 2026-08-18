import assert from 'node:assert/strict'
import test from 'node:test'
import { buildWaitlistConfirmationEmail } from '../src/waitlist-email.js'

test('confirmation email presents a branded button and a useful plain fallback', () => {
  const url = 'https://primis3d.com/confirm?t=opaque-token'
  const email = buildWaitlistConfirmationEmail(url)

  assert.match(email.html, /Confirm my email/)
  assert.match(email.html, /href="https:\/\/primis3d\.com\/confirm\?t=opaque-token"/)
  assert.match(email.html, /Primis Intelligence UG/)
  assert.doesNotMatch(email.html, /workers\.dev/)
  assert.match(email.text, /Confirm your email: https:\/\/primis3d\.com\/confirm\?t=opaque-token/)
})
