import { execFileSync } from 'node:child_process';

const [base, head, branchName] = process.argv.slice(2);
if (!base || !head || !branchName) {
  console.error('Usage: node scripts/coding-lab-pr-guard.mjs <base-sha> <head-sha> <branch-name>');
  process.exit(2);
}
if (!branchName.startsWith('mruneel-coding/')) {
  console.error('Coding Lab PRs must use a branch name beginning mruneel-coding/.');
  process.exit(1);
}
const changed = execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMR', base, head], { encoding: 'utf8' })
  .split('\n').filter(Boolean);
if (!changed.length) {
  console.error('No changed files found in PR.');
  process.exit(1);
}
const blocked = [
  /^\.github\//, /^android\//, /^server\.ts$/, /^package(?:-lock)?\.json$/,
  /^capacitor\.config/, /(^|\/)\.env(?:$|[./])/i, /(^|\/)secrets?\//i, /\.(?:pem|key|p12|pfx|jks)$/i,
  /(^|\/)(security|auth|permissions?|devicebridge|offlineengine|speechservice|memorymanager|lockscreen|androidpermissionshub|settingsmodal)(\.[^/]+)?$/i
];
const disallowed = changed.filter(path => !path.startsWith('src/') || blocked.some(pattern => pattern.test(path)));
if (disallowed.length) {
  console.error('Coding Lab PR policy blocked these paths:');
  for (const path of disallowed) console.error(' - ' + path);
  console.error('Only ordinary src/ files are allowed. Sensitive device, permission, memory, security, server, Android, CI and dependency files require human-created PRs.');
  process.exit(1);
}
const diff = execFileSync('git', ['diff', '--unified=0', base, head, '--', ...changed], { encoding: 'utf8' });
const secretPatterns = [
  /\bAIza[0-9A-Za-z_-]{30,}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{30,}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b/,
  /-----BEGIN (?:RSA|EC|OPENSSH|PRIVATE) KEY-----/
];
const additions = diff.split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++'));
const secretLines = additions.filter(line => secretPatterns.some(pattern => pattern.test(line)));
if (secretLines.length) {
  console.error('Potential credential/private-key pattern found in added lines. Remove it and rotate any exposed credential.');
  process.exit(1);
}
console.log('Coding Lab PR guard passed.');
console.log('Checked files:', changed.join(', '));
