import { validateCodingAgentProposal, makeCodingAgentBranch, type CodingAgentCommitProposal } from './codingAgentPolicy';

const API = 'https://api.github.com';
const OWNER = 'shubhamkoli1510-coder';
const REPO = 'MRUNEEL-APP-SOURCE-';

type GitHubJson = Record<string, unknown>;
async function gh<T extends GitHubJson>(token: string, route: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(API + route, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : `GitHub API failed (${response.status})`;
    throw new Error(message);
  }
  return data as T;
}

export interface CodingAgentWriteInput extends CodingAgentCommitProposal {
  baseBranch?: string;
}

export interface CodingAgentWriteResult {
  branch: string;
  pullRequestUrl: string;
  pullRequestNumber: number;
  filesCommitted: string[];
}

export async function createCodingAgentDraftPR(input: CodingAgentWriteInput, token: string): Promise<CodingAgentWriteResult> {
  const policy = validateCodingAgentProposal(input);
  if (!policy.allowed) throw new Error(policy.errors.join(' '));
  if (!token || token.length < 20) throw new Error('GitHub write token is not configured.');
  const baseBranch = input.baseBranch || process.env.MRUNEEL_CODING_BASE_BRANCH || 'feature/mruneel-jarvis-parity-foundation-phase1';
  if (!/^[A-Za-z0-9._/-]{1,120}$/.test(baseBranch) || baseBranch.includes('..')) throw new Error('Invalid configured base branch.');

  const baseRef = await gh<{object:{sha:string}}>(token, `/repos/${OWNER}/${REPO}/git/ref/heads/${encodeURIComponent(baseBranch).replace(/%2F/g,'/')}`);
  const baseSha = baseRef.object.sha;
  const branch = `${makeCodingAgentBranch(input.task)}-${Date.now().toString(36)}`;
  await gh(token, `/repos/${OWNER}/${REPO}/git/refs`, 'POST', { ref: `refs/heads/${branch}`, sha: baseSha });

  const committed: string[] = [];
  for (const file of policy.normalizedFiles) {
    const path = file.path.split('/').map(encodeURIComponent).join('/');
    let existingSha: string | undefined;
    try {
      const existing = await gh<{sha?:string}>(token, `/repos/${OWNER}/${REPO}/contents/${path}?ref=${encodeURIComponent(branch)}`);
      existingSha = existing.sha;
    } catch (error) {
      if (!(error instanceof Error) || !/Not Found/i.test(error.message)) throw error;
    }
    await gh(token, `/repos/${OWNER}/${REPO}/contents/${path}`, 'PUT', {
      message: `MRUNEEL coding agent: ${input.task.trim().slice(0,72)}`,
      content: btoa(unescape(encodeURIComponent(file.content))),
      branch,
      ...(existingSha ? { sha: existingSha } : {}),
    });
    committed.push(file.path);
  }

  const pr = await gh<{html_url:string;number:number}>(token, `/repos/${OWNER}/${REPO}/pulls`, 'POST', {
    title: `MRUNEEL Coding Agent: ${input.task.trim().slice(0,72)}`,
    head: branch,
    base: baseBranch,
    draft: true,
    body: [
      '## Automated Coding Agent Proposal',
      '',
      `**Task:** ${input.task.trim()}`,
      '',
      'Files were proposed by MRUNEEL and written to an isolated branch after explicit approval.',
      'Review every diff and run CI. This PR is draft; it is not merged, deployed, or released.',
      '',
      '### Files',
      ...committed.map(file => `- \`${file}\``),
    ].join('\n'),
  });
  return { branch, pullRequestUrl: pr.html_url, pullRequestNumber: pr.number, filesCommitted: committed };
}
