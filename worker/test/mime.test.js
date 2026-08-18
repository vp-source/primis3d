import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMimeMessage, encodeHeader } from '../src/mime.js'

test('plain ASCII mail uses readable headers and 7bit content', () => {
  const message = buildMimeMessage({
    fromEmail: 'info@primis3d.com',
    fromName: 'Primis',
    to: 'person@example.com',
    subject: 'Confirm your Atlas launch notification',
    text: 'Confirm this address.\nThank you.',
  })

  assert.match(message, /From: Primis <info@primis3d\.com>/)
  assert.match(message, /Subject: Confirm your Atlas launch notification/)
  assert.match(message, /Content-Transfer-Encoding: 7bit/)
  assert.match(message, /\r\n\r\nConfirm this address\.\r\nThank you\.$/)
  assert.doesNotMatch(message, /\?UTF-8\?B\?/)
})

test('non-ASCII headers and content remain UTF-8 safe', () => {
  const message = buildMimeMessage({
    fromEmail: 'info@primis3d.com',
    fromName: 'Primis',
    to: 'person@example.com',
    subject: 'Anfrage von Jörg',
    text: 'Grüße',
  })

  assert.match(message, /Subject: =\?UTF-8\?B\?/)
  assert.match(message, /Content-Transfer-Encoding: base64/)
  assert.equal(encodeHeader('Primis'), 'Primis')
})

test('HTML mail is sent as multipart alternative with a plain-text fallback', () => {
  const message = buildMimeMessage({
    fromEmail: 'info@primis3d.com',
    fromName: 'Primis',
    to: 'person@example.com',
    subject: 'Confirm your place',
    text: 'Use https://primis3d.com/confirm?t=example',
    html: '<html><body><a href="https://primis3d.com/confirm?t=example">Confirm my email</a></body></html>',
  })

  assert.match(message, /Content-Type: multipart\/alternative/)
  assert.match(message, /Content-Type: text\/plain; charset=UTF-8/)
  assert.match(message, /Content-Type: text\/html; charset=UTF-8/)
  assert.match(message, /Content-Transfer-Encoding: base64/)
  assert.match(message, /--primis_[a-f0-9]+--$/)
})
