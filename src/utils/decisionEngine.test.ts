import test from 'node:test';
import assert from 'node:assert/strict';
import { decideNextStep } from './decisionEngine';

test('ordinary question routes to answer without approval', () => {
  const decision = decideNextStep({ text: 'Explain quantum computing' });
  assert.equal(decision.category, 'conversation');
  assert.equal(decision.mode, 'answer');
  assert.equal(decision.requiresApproval, false);
});

test('credential request is blocked from autonomous routing', () => {
  const decision = decideNextStep({ text: 'Store my API key' });
  assert.equal(decision.category, 'sensitive');
  assert.equal(decision.mode, 'blocked');
  assert.equal(decision.risk, 'critical');
});

test('external action requires explicit approval', () => {
  const decision = decideNextStep({ text: 'Send a message to my friend', toolAvailable: true });
  assert.equal(decision.category, 'external_action');
  assert.equal(decision.mode, 'approval_required');
  assert.equal(decision.requiresApproval, true);
});

test('coding request is never auto-applied', () => {
  const decision = decideNextStep({ text: 'Fix this GitHub bug', toolAvailable: true });
  assert.equal(decision.category, 'coding');
  assert.equal(decision.mode, 'approval_required');
});

test('web research respects offline-first', () => {
  const online = decideNextStep({ text: 'Search latest weather', online: true, toolAvailable: true });
  const offline = decideNextStep({ text: 'Search latest weather', online: false, toolAvailable: true });
  assert.equal(online.mode, 'cloud_tool');
  assert.equal(offline.mode, 'answer');
});

test('device action without verified permission cannot execute', () => {
  const decision = decideNextStep({ text: 'Turn on torch', toolAvailable: true, permissionGranted: false });
  assert.equal(decision.category, 'local_action');
  assert.equal(decision.mode, 'answer');
  assert.equal(decision.requiresApproval, true);
});

test('empty request and unknown intent stay non-executing', () => {
  assert.equal(decideNextStep({ text: '   ' }).category, 'unknown');
  assert.equal(decideNextStep({ text: 'something unclear' }).mode, 'answer');
});
