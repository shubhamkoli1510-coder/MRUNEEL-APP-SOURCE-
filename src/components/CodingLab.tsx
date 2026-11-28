import React, { useState } from 'react';
import { createMultiFileProposalReviewSnapshot, isMultiFileProposalReviewApproved, type CodingLabSourceFile } from '../core/codingLabApproval';
import { Code2, X, Loader2, ShieldCheck, Copy, Download, ClipboardCheck } from 'lucide-react';

interface CodingLabProps { isOpen: boolean; onClose: () => void; }
interface CodingProposal {
  summary?: string;
  filesToChange?: string[];
  risks?: string[];
  testsToRun?: string[];
  unifiedDiff?: string;
  needsHumanApproval?: boolean;
}
const API_BASE_URL = 'https://mruneel-core-api.onrender.com';

export const CodingLab: React.FC<CodingLabProps> = ({ isOpen, onClose }) => {
  const [task, setTask] = useState('');
  const [filePath, setFilePath] = useState('src/App.tsx');
  const [source, setSource] = useState('');
  const [result, setResult] = useState<CodingProposal | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [approvedSnapshot, setApprovedSnapshot] = useState<string | null>(null);
  const reviewApproved = isMultiFileProposalReviewApproved(approvedSnapshot, task, files, result);
  if (!isOpen) return null;

  const fetchRepoFiles = async () => {\n    setError(''); setNotice(''); setResult(null); setApprovedSnapshot(null);\n    const paths = filePaths.split('\\n').map(p=>p.trim()).filter(Boolean);\n    if (paths.length < 1 || paths.length > 5) { setError('1 ते 5 file paths दे.'); return; }\n    setLoading(true);\n    try {\n      const response = await fetch(`${API_BASE_URL}/api/coding/repo-files`, { method:'POST', headers:{'Content-Type':'application/json'}, signal:AbortSignal.timeout(60000), body:JSON.stringify({paths}) });\n      const data = await response.json();\n      if (!response.ok) throw new Error(data.error || 'Repo files fetch failed');\n      setFiles(data.files as CodingLabSourceFile[]); setNotice(`Repo मधून ${data.files.length} files read झाल्या (${data.ref}). Read-only.`);\n    } catch(e) { setError((e as Error).message || 'Repository fetch failed.'); }\n    finally { setLoading(false); }\n  };\n\n  const generatePlan = async () => {
    setError(''); setNotice(''); setResult(null);
    if (!task.trim()) { setError('काय बदल करायचा आहे ते लिही.'); return; }
    if (!filePath.trim() || !source.trim()) { setError('अचूक file path आणि त्या file चा पूर्ण source code द्यावा लागेल. रिकाम्या source वर code बनवू नको.'); return; }
    if (source.length > 20000) { setError('एका file ची मर्यादा 20,000 characters आहे.'); return; }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/coding/plan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(60000),
        body: JSON.stringify({ task, files }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Coding Lab request failed');
      if (!data.proposal || typeof data.proposal !== 'object') throw new Error('Server ने योग्य proposal परत दिला नाही.');
      setResult(data.proposal as CodingProposal);
    } catch (e) { setError((e as Error).message || 'Server शी संपर्क झाला नाही.'); }
    finally { setLoading(false); }
  };

  const copyPatch = async () => {
    if (!result?.unifiedDiff || !reviewApproved) { setNotice('Patch export करण्यापूर्वी proposal approve कर.'); return; }
    try { await navigator.clipboard?.writeText(result.unifiedDiff); setNotice('Patch clipboard मध्ये copy झाला.'); }
    catch { setNotice('Copy करता आलं नाही. Download patch वापर.'); }
  };
  const downloadPatch = () => {
    if (!result?.unifiedDiff || !reviewApproved) { setNotice('Patch export करण्यापूर्वी proposal approve कर.'); return; }
    const patch = new Blob([result.unifiedDiff], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(patch);
    const link = document.createElement('a');
    link.href = url; link.download = 'mruneel-proposal.patch'; link.click();
    URL.revokeObjectURL(url);
    setNotice('Patch download सुरू झाला. Apply करण्यापूर्वी review आणि tests आवश्यक आहेत.');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-3">
      <section className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-amber-500/40 bg-[#07111f] text-sky-100 shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-[#07111f] border-b border-amber-500/20">
          <div className="flex items-center gap-2"><Code2 className="text-amber-400"/><div><h2 className="font-bold text-amber-300">MRUNEEL CODING LAB</h2><p className="text-[10px] text-sky-300/70">Proposal • Review • Patch export</p></div></div>
          <button onClick={onClose} aria-label="Close Coding Lab" className="p-2"><X/></button>
        </header>
        <div className="p-4 space-y-3">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-200 flex gap-2"><ShieldCheck className="w-5 h-5 shrink-0"/>हा टप्पा फक्त proposal बनवतो. Repository files बदलत नाही, shell commands चालवत नाही, commit/push/PR किंवा APK install करत नाही. Patch export करून स्वतंत्र branch मध्ये review कर.</div>
          <label className="block text-xs text-amber-200">काय coding करायचं आहे?</label>
          <textarea value={task} onChange={e=>{setTask(e.target.value);setApprovedSnapshot(null);}} rows={3} maxLength={4000} placeholder="उदा. voice command मधील error handling सुधार..." className="w-full rounded-lg bg-black/50 border border-sky-800 p-3 text-sm outline-none focus:border-amber-400"/>
          <label className="block text-xs text-amber-200">Source file path (अचूक)</label>
          <input value={filePath} onChange={e=>setFilePath(e.target.value)} className="w-full rounded-lg bg-black/50 border border-sky-800 p-2 text-sm"/>
          <label className="block text-xs text-amber-200">त्या file चा पूर्ण source code (कमाल 20,000 अक्षरे)</label>
          <textarea value={source} onChange={e=>setSource(e.target.value)} rows={6} placeholder="File मधला code paste कर..." className="w-full rounded-lg bg-black/50 border border-sky-800 p-3 text-xs font-mono outline-none focus:border-amber-400"/>
          <button disabled={loading} onClick={generatePlan} className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 text-black font-bold py-3 disabled:opacity-50">{loading?<Loader2 className="animate-spin"/>:<Code2/>}{loading?'विचार सुरू आहे...':'CODE PLAN तयार कर'}</button>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
          {result && <div className="space-y-3 border-t border-amber-500/20 pt-3">
            <h3 className="font-bold text-amber-300">Review proposal</h3><p className="text-sm whitespace-pre-wrap">{result.summary || 'Summary नाही.'}</p>
            {!!result.filesToChange?.length && <div><p className="text-xs text-amber-200 mb-1">बदल प्रस्तावित files</p><ul className="text-xs list-disc pl-5">{result.filesToChange.map((p:string)=><li key={p}>{p}</li>)}</ul></div>}
            {!!result.risks?.length && <div><p className="text-xs text-amber-200 mb-1">धोके / review points</p><ul className="text-xs list-disc pl-5">{result.risks.map((p:string,i:number)=><li key={i}>{p}</li>)}</ul></div>}
            {!!result.testsToRun?.length && <div><p className="text-xs text-amber-200 mb-1">Tests — सुचवलेले</p><ul className="text-xs list-disc pl-5">{result.testsToRun.map((p:string,i:number)=><li key={i}>{p}</li>)}</ul></div>}
            {result.unifiedDiff && <div><div className="flex flex-wrap justify-between items-center gap-2"><p className="text-xs text-amber-200">Patch preview</p><div className="flex gap-2"><button disabled={!reviewApproved} onClick={copyPatch} className="text-xs flex items-center gap-1 border border-sky-700 rounded px-2 py-1 disabled:opacity-40"><Copy size={13}/> Copy</button><button disabled={!reviewApproved} onClick={downloadPatch} className="text-xs flex items-center gap-1 border border-amber-500/50 rounded px-2 py-1 disabled:opacity-40"><Download size={13}/> Download</button></div></div><pre className="whitespace-pre-wrap break-all text-[11px] bg-black/60 rounded-lg p-3 max-h-72 overflow-auto">{result.unifiedDiff}</pre><div className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-3 mt-2 space-y-2"><p className="text-sm font-semibold text-amber-200">Human review / approval</p><p className="text-xs text-sky-100">Diff, source, task, risk आणि test plan तपासूनच approve कर. यामुळे फक्त patch export unlock होतो; GitHub write/merge/deploy होत नाही.</p><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={reviewApproved} onChange={e=>setApprovedSnapshot(e.target.checked ? createMultiFileProposalReviewSnapshot(task,files,result) : null)} className="mt-1 accent-amber-400"/><span>मी हा exact proposal आणि diff तपासला आहे; patch export ला मंजुरी देतो.</span></label>{reviewApproved && <p className="text-xs text-emerald-300">Approved for export. Task/source/diff बदलल्यास approval आपोआप invalid होईल.</p>}</div></div>}
            <div className="rounded-lg border border-sky-700/40 p-3 text-xs space-y-1"><p className="font-semibold text-sky-200 flex items-center gap-1"><ClipboardCheck size={14}/> Apply करण्यापूर्वी</p><p>1. Diff पूर्ण वाच.</p><p>2. फक्त स्वतःच्या feature branch वर apply कर.</p><p>3. Type-check + production build पूर्ण कर.</p><p>4. Android permissions/security/native files बदलले असतील तर स्वतंत्र manual review.</p><p>5. CI pass झाल्याशिवाय merge किंवा APK release करू नको.</p></div>
            <p className="text-xs text-emerald-300">Proposal तयार झाला. Approval नंतर patch export करता येईल. Repository मध्ये कोणताही बदल केलेला नाही.</p>
          </div>}
        </div>
      </section>
    </div>
  );
};
