import React, { useState } from 'react';
import { Code2, X, Loader2, ShieldCheck, Copy } from 'lucide-react';

interface CodingLabProps { isOpen: boolean; onClose: () => void; }

const API_BASE_URL = 'https://mruneel-core-api.onrender.com';

export const CodingLab: React.FC<CodingLabProps> = ({ isOpen, onClose }) => {
  const [task, setTask] = useState('');
  const [filePath, setFilePath] = useState('src/App.tsx');
  const [source, setSource] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const generatePlan = async () => {
    setError('');
    setResult(null);
    if (!task.trim()) { setError('काय बदल करायचा आहे ते लिही.'); return; }
    if (source.length > 20000) { setError('एका file ची मर्यादा 20,000 characters आहे.'); return; }
    setLoading(true);
    try {
      const files = source.trim() ? [{ path: filePath.trim(), content: source }] : [];
      const response = await fetch(`${API_BASE_URL}/api/coding/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(60000),
        body: JSON.stringify({ task, files }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Coding Lab request failed');
      setResult(data.proposal);
    } catch (e) {
      setError((e as Error).message || 'Server शी संपर्क झाला नाही.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-3">
      <section className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-amber-500/40 bg-[#07111f] text-sky-100 shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-[#07111f] border-b border-amber-500/20">
          <div className="flex items-center gap-2"><Code2 className="text-amber-400"/><div><h2 className="font-bold text-amber-300">MRUNEEL CODING LAB</h2><p className="text-[10px] text-sky-300/70">सुरक्षित code proposal mode</p></div></div>
          <button onClick={onClose} aria-label="Close Coding Lab" className="p-2"><X/></button>
        </header>
        <div className="p-4 space-y-3">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-200 flex gap-2"><ShieldCheck className="w-5 h-5 shrink-0"/>हा मोड फक्त योजना आणि code diff सुचवतो. तो files बदलत नाही, shell commands चालवत नाही किंवा APK install करत नाही.</div>
          <label className="block text-xs text-amber-200">काय coding करायचं आहे?</label>
          <textarea value={task} onChange={e=>setTask(e.target.value)} rows={3} maxLength={4000} placeholder="उदा. voice command मधील error हाताळणी सुधार..." className="w-full rounded-lg bg-black/50 border border-sky-800 p-3 text-sm outline-none focus:border-amber-400"/>
          <label className="block text-xs text-amber-200">ऐच्छिक: Source file path</label>
          <input value={filePath} onChange={e=>setFilePath(e.target.value)} className="w-full rounded-lg bg-black/50 border border-sky-800 p-2 text-sm"/>
          <label className="block text-xs text-amber-200">ऐच्छिक: त्या file चा code (कमाल 20,000 अक्षरे)</label>
          <textarea value={source} onChange={e=>setSource(e.target.value)} rows={5} placeholder="इथे संबंधित source code paste कर..." className="w-full rounded-lg bg-black/50 border border-sky-800 p-3 text-xs font-mono outline-none focus:border-amber-400"/>
          <button disabled={loading} onClick={generatePlan} className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 text-black font-bold py-3 disabled:opacity-50">{loading?<Loader2 className="animate-spin"/>:<Code2/>}{loading?'विचार सुरू आहे...':'CODE PLAN तयार कर'}</button>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          {result && <div className="space-y-3 border-t border-amber-500/20 pt-3">
            <h3 className="font-bold text-amber-300">योजना</h3><p className="text-sm whitespace-pre-wrap">{result.summary}</p>
            {!!result.filesToChange?.length && <div><p className="text-xs text-amber-200 mb-1">बदलायच्या files</p><ul className="text-xs list-disc pl-5">{result.filesToChange.map((p:string)=><li key={p}>{p}</li>)}</ul></div>}
            {!!result.risks?.length && <div><p className="text-xs text-amber-200 mb-1">धोके / तपासणी</p><ul className="text-xs list-disc pl-5">{result.risks.map((p:string,i:number)=><li key={i}>{p}</li>)}</ul></div>}
            {!!result.testsToRun?.length && <div><p className="text-xs text-amber-200 mb-1">सुचवलेल्या चाचण्या</p><ul className="text-xs list-disc pl-5">{result.testsToRun.map((p:string,i:number)=><li key={i}>{p}</li>)}</ul></div>}
            {result.unifiedDiff && <div><div className="flex justify-between items-center"><p className="text-xs text-amber-200">Proposed diff (फक्त preview)</p><button onClick={()=>navigator.clipboard?.writeText(result.unifiedDiff)} className="text-xs flex items-center gap-1"><Copy size={13}/> Copy</button></div><pre className="whitespace-pre-wrap break-all text-[11px] bg-black/60 rounded-lg p-3 max-h-72 overflow-auto">{result.unifiedDiff}</pre></div>}
            <p className="text-xs text-emerald-300">Proposal तयार. कोणतीही file बदललेली नाही.</p>
          </div>}
        </div>
      </section>
    </div>
  );
};
