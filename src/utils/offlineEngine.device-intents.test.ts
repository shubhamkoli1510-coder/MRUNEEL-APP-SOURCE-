import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOfflineCommand } from './offlineEngine';

test('recognizes Wi-Fi settings launcher', () => {
  const result = parseOfflineCommand('open wifi settings');
  assert.equal(result.type, 'OPEN_SCREEN');
  assert.equal(result.payload?.target, 'wifi');
});

test('recognizes Bluetooth settings launcher', () => {
  const result = parseOfflineCommand('open bluetooth');
  assert.equal(result.type, 'OPEN_SCREEN');
  assert.equal(result.payload?.target, 'bluetooth');
});

test('recognizes Android Settings launcher', () => {
  const result = parseOfflineCommand('open settings');
  assert.equal(result.type, 'OPEN_SCREEN');
  assert.equal(result.payload?.target, 'settings');
});

test('recognizes phone camera launcher distinctly from scanner', () => {
  const result = parseOfflineCommand('open phone camera');
  assert.equal(result.type, 'OPEN_SCREEN');
  assert.equal(result.payload?.target, 'camera');
});

test('recognizes dialer but never a call request', () => {
  const result = parseOfflineCommand('open dialer');
  assert.equal(result.type, 'OPEN_SCREEN');
  assert.equal(result.payload?.target, 'dialer');
});

test('volume commands are bounded single-step intents', () => {
  assert.equal(parseOfflineCommand('volume up').payload?.direction, 1);
  assert.equal(parseOfflineCommand('आवाज कमी कर').payload?.direction, -1);
});

test('recognizes allowlisted WhatsApp launcher', () => {
  const result = parseOfflineCommand('open WhatsApp');
  assert.equal(result.type, 'OPEN_APP');
  assert.equal(result.payload?.appId, 'whatsapp');
});

test('recognizes allowlisted YouTube launcher in Marathi', () => {
  const result = parseOfflineCommand('यूट्यूब उघड');
  assert.equal(result.type, 'OPEN_APP');
  assert.equal(result.payload?.appId, 'youtube');
});
