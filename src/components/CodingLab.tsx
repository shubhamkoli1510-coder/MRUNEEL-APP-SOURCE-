import React, { useState } from 'react';
import { createMultiFileProposalReviewSnapshot, isMultiFileProposalReviewApproved, type CodingLabSourceFile } from '../core/codingLabApproval';
import { initialCodingLoopState, transitionCodingLoop, canCodingLoopExport, type CodingLoopState } from '../core/autonomousCodingLoop';
import { validateCodingProposalDiff } from '../core/codingProposalDiffPolicy';
import { Code2, X, Loader2, ShieldCheck, Copy, Download, ClipboardCheck } from 'lucide-react';

interface CodingLabProps { isOpen: boolean; onClose: () => void; }
interface CodingProposal { summary?: string; filesToChange?: string[]; risks?: string[]; testsToRun?: string[]; unifiedDiff?: string; needsHumanApproval?: boolean; }
const API_BASE_URL = 'https://mruneel-core-api.onrender.com';

export const CodingLab: React.FC<CodingLabProps> = ({ isOpen, onClose }) => {
  const [task, setTask] = useState('');
  const [filePaths, setFilePaths] = useState('src/App.tsx');
  const [files, setFiles] = useState<CodingLabSourceFile[]>([]);
  const [result, setResult] = useState<CodingProposal | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [approvedSnapshot, setApprovedSnapshot] = useState<string | null>(null);
  const [loopState, setLoopState] = useState<CodingLoopState>(initialCodingLoopState);
  const reviewApproved = isMultiFileProposalReviewApproved(approvedSnapshot, task, files, result);
  const stageLabel: Record<CodingLoopState['stage'], string> = { idle: 'तयार', planning: 'Task planning', proposing: 'Proposal तयार होत आहे', validating: 'Proposal तपासत आहे', revising: 'दुरुस्ती आवश्यक', awaiting_review: 'तुझ्या review साठी तयार', approved: 'Export मंजूर', exported: 'Patch export झाला', blocked: 'Safety block', failed: 'Failed', cancelled: 'Cancelled' };
  if (!isOpen) return null;

  const fetchRepoFiles = async () => {
    setError(''); setNotice(''); setResult(null); setApprovedSnapshot(null); setLoopState(initialCodingLoopState);
    const paths = filePaths.split('\n').map(p => p.trim()).filter(Boolean);
    if (paths.length < 1 || paths.length > 5) { setError('1 ते 5 file paths दे.'); return; }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/coding/repo-files`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(60000), body: JSON.stringify({ paths }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Repo files fetch failed');
      setFiles(data.files as CodingLabSourceFile[]);
      setNotice(`Repo मधून ${data.files.length} files read झाल्या (${data.ref}). Read-only.`);
    } catch (e) { setError((e as Error).message || 'Repository fetch failed.'); }
    finally { setLoading(false); }
  };

  const generatePlan = async () => {
    setError(''); setNotice(''); setResult(null); setApprovedSnapshot(null); setLoopState(initialCodingLoopState);
    if (!task.trim()) { setError('काय coding करायचं ते लिही.'); return; }
    if (!files.length || files.some(f => !f.path.trim() || !f.content.trim())) { setError('आधी repo मधून source files fetch कर.'); return; }
    if (files.length > 5 || files.some(f => f.content.length > 20000) || files.reduce((sum, f) => sum + f.content.length, 0) > 50000) { setError('Files limit: 5 files, 20k/file, 50k total.'); return; }
    setLoopState(transitionCodingLoop(initialCodingLoopState, { type: 'start', task }));
    setLoading(true);
    try {
      let feedback = '';
      let accepted: CodingProposal | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const response = await fetch(`${API_BASE_URL}/api/coding/plan`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(60000), body: JSON.stringify({ task: feedback ? `${task}\\n\\nPrevious proposal validation feedback: ${feedback}\\nReturn a corrected proposal with a non-empty unified diff.` : task, files }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Coding Lab request failed');
        if (!data.proposal || typeof data.proposal !== 'object') throw new Error('Server ने योग्य proposal दिला नाही.');
        if (attempt === 0) setLoopState(prev => transitionCodingLoop(prev, { type: 'plan_ready' }));
        setLoopState(prev => transitionCodingLoop(prev, { type: 'proposal_ready' }));
        const proposal = data.proposal as CodingProposal;
        // Structural-only validation: non-empty diff required. No tests/commands run here.
        if (typeof proposal.unifiedDiff === 'string' && proposal.unifiedDiff.trim()) {
          setLoopState(prev => transitionCodingLoop(prev, { type: 'validation_passed' }));
          accepted = proposal;
          break;
        }
        feedback = validation.errors.join(' ');
        setLoopState(prev => transitionCodingLoop(prev, { type: 'validation_failed', reason: feedback }));
        if (attempt < 2) setLoopState(prev => transitionCodingLoop(prev, { type: 'revision_ready' }));
      }
      if (!accepted) throw new Error('3 proposal attempts झाले; valid diff मिळाला नाही. Task/source बदलून पुन्हा प्रयत्न कर.');
      setResult(accepted);
    } catch (e) { setError((e as Error).message || 'Server शी संपर्क झाला नाही.'); }
    finally { setLoading(false); }
  };

  const copyPatch = async () => {
    if (!result?.unifiedDiff || !reviewApproved || !canCodingLoopExport(loopState)) { setNotice('Patch export करण्यापूर्वी proposal approve कर.'); return; }
    try { if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable'); await navigator.clipboard.writeText(result.unifiedDiff); setLoopState(prev => transitionCodingLoop(prev, { type: 'export_completed' })); setNotice('Patch clipboard मध्ये copy झाला.'); }
    catch { setNotice('Copy करता आलं नाही. Download patch वापर.'); }
  };
  const downloadPatch = () => {
    if (!result?.unifiedDiff || !reviewApproved || !canCodingLoopExport(loopState)) { setNotice('Patch export करण्यापूर्वी proposal approve कर.'); return; }
    const patch = new Blob([result.unifiedDiff], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(patch);
    const link = document.createElement('a'); link.href = url; link.download = 'mruneel-proposal.patch'; link.click();
    URL.revokeObjectURL(url); setLoopState(prev => transitionCodingLoop(prev, { type: 'export_completed' })); setNotice('Patch download सुरू झाला. Apply करण्यापूर्वी review आणि tests आवश्यक आहेत.');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-3">
      <section className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-amber-500/40 bg-[#07111f] text-sky-100 shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-[#07111f] border-b border-amber-500/20">
          <div className="flex items-center gap-2"><Code2 className="text-amber-400"/><div><h2 className="font-bold text-amber-300">MRUNEEL CODING LAB</h2><p className="text-[10px] text-sky-300/70">Repository Read • Proposal • Review</p></div></div>
          <button onClick={onClose} aria-label="Close Coding Lab" className="p-2"><X/></button>
        </header>
        <div className="p-4 space-y-3">
          <div className="rounded-md border border-sky-700/50 px-3 py-2 text-xs"><span className="text-sky-300">Coding lifecycle: </span><strong>{stageLabel[loopState.stage]}</strong><span className="ml-2 text-sky-300/60">({loopState.validationAttempts}/3 checks, {loopState.revisions}/2 revisions)</span></div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-200 flex gap-2"><ShieldCheck className="w-5 h-5 shrink-0"/>Repo वाचन read-only आहे. Files बदलणे, shell, commit/push, merge, deploy किंवा release नाही. Patch फक्त review नंतर export.</div>
          <label className="block text-xs text-amber-200">Coding task</label>
          <textarea value={task} onChange={e => {setTask(e.target.value); setApprovedSnapshot(null); setLoopState(initialCodingLoopState);}} rows={3} maxLength={4000} placeholder="उदा. offline command handling सुधार..." className="w-full rounded-lg bg-black/50 border border-sky-800 p-3 text-sm"/>
          <label className="block text-xs text-amber-200">GitHub repo file paths (प्रत्येक नवीन ओळीवर, max 5)</label>
          <textarea value={filePaths} onChange={e => {setFilePaths(e.target.value); setFiles([]); setResult(null); setApprovedSnapshot(null); setLoopState(initialCodingLoopState);}} rows={3} placeholder="src/App.tsx\nsrc/core/brainRouter.ts" className="w-full rounded-lg bg-black/50 border border-sky-800 p-2 text-xs font-mono"/>
          <button disabled={loading} onClick={fetchRepoFiles} className="w-full rounded-lg border border-sky-600 py-2 text-sm disabled:opacity-50">{loading ? 'वाचत आहे...' : 'GitHub मधून source files वाच'}</button>
          {!!files.length && <div className="space-y-2 border border-sky-800 rounded-lg p-2"><p className="text-xs text-emerald-300">Fetched source — edits केल्यास proposal reset होईल</p>{files.map((f, i) => <div key={f.path} className="space-y-1"><label className="text-xs text-amber-200">{f.path}</label><textarea value={f.content} onChange={e => {setFiles(prev => prev.map((item, j) => j === i ? {...item, content: e.target.value} : item)); setResult(null); setApprovedSnapshot(null); setLoopState(initialCodingLoopState);}} rows={4} className="w-full rounded bg-black/60 border border-sky-900 p-2 text-[11px] font-mono"/></div>)}</div>}
          <p className="text-[10px] text-sky-300/70">Read-only public repository; 5 files max, 20k characters/file, 50k total. Server ref defaults to main.</p>
          <button disabled={loading || !files.length} onClick={generatePlan} className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 text-black font-bold py-3 disabled:opacity-50">{loading ? <Loader2 className="animate-spin"/> : <Code2/>}{loading ? 'Plan तयार होत आहे...' : 'CODE PLAN तयार कर'}</button>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
          {result && <div className="space-y-3 border-t border-amber-500/20 pt-3">
            <h3 className="font-bold text-amber-300">Proposal review</h3><p className="text-sm whitespace-pre-wrap">{result.summary || 'Summary नाही.'}</p>
            {!!result.filesToChange?.length && <div><p className="text-xs text-amber-200">Files प्रस्तावित</p><ul className="text-xs list-disc pl-5">{result.filesToChange.map(p => <li key={p}>{p}</li>)}</ul></div>}
            {!!result.risks?.length && <div><p className="text-xs text-amber-200">Risks</p><ul className="text-xs list-disc pl-5">{result.risks.map((p,i) => <li key={i}>{p}</li>)}</ul></div>}
            {!!result.testsToRun?.length && <div><p className="text-xs text-amber-200">Tests</p><ul className="text-xs list-disc pl-5">{result.testsToRun.map((p,i) => <li key={i}>{p}</li>)}</ul></div>}
            {result.unifiedDiff && <div><div className="flex flex-wrap justify-between items-center gap-2"><p className="text-xs text-amber-200">Patch preview</p><div className="flex gap-2"><button disabled={!reviewApproved || !canCodingLoopExport(loopState)} onClick={copyPatch} className="text-xs border border-sky-700 rounded px-2 py-1 disabled:opacity-40"><Copy size={13}/> Copy</button><button disabled={!reviewApproved || !canCodingLoopExport(loopState)} onClick={downloadPatch} className="text-xs border border-amber-500/50 rounded px-2 py-1 disabled:opacity-40"><Download size={13}/> Download</button></div></div><pre className="whitespace-pre-wrap break-all text-[11px] bg-black/60 rounded-lg p-3 max-h-72 overflow-auto">{result.unifiedDiff}</pre><div className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-3 mt-2 space-y-2"><p className="text-sm font-semibold text-amber-200">Human approval</p><p className="text-xs">Exact task, fetched file contents, proposal and diff तपासून approve कर. Approval फक्त local patch export साठी आहे. येथे test suite execute होत नाही; proposal structure/diff check एवढंच validation.</p><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={reviewApproved} onChange={e => { setApprovedSnapshot(e.target.checked ? createMultiFileProposalReviewSnapshot(task, files, result) : null); setLoopState(prev => e.target.checked ? transitionCodingLoop(prev, { type: 'explicit_approval' }) : ({ ...prev, stage: 'awaiting_review', approved: false })); }} className="mt-1 accent-amber-400"/><span>मी exact proposal/diff तपासला आणि export मंजूर करतो.</span></label>{reviewApproved && <p className="text-xs text-emerald-300">Approval active; बदलल्यास invalid होईल.</p>}</div></div>}
            <div className="rounded-lg border border-sky-700/40 p-3 text-xs space-y-1"><p className="font-semibold text-sky-200 flex items-center gap-1"><ClipboardCheck size={14}/> Apply safety</p><p>Diff तपास • स्वतंत्र branch • tests/build • CI पास झाल्याशिवाय merge/release नाही.</p></div>
          </div>}
        </div>
      </section>
    </div>
  );
};
