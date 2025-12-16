import React, { useState } from 'react';
import { Paper } from '../types';

interface PaperCardProps {
  paper: Paper;
}

export const PaperCard: React.FC<PaperCardProps> = ({ paper }) => {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Determine border color based on score
  const scoreColor = paper.engagementScore > 85 ? 'border-primary-500 shadow-[0_0_15px_rgba(14,165,233,0.3)]' 
                   : paper.engagementScore > 70 ? 'border-primary-600/50' 
                   : 'border-slate-800';

  const handleNotebookLM = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(paper.url);
    setCopied(true);
    window.open('https://notebooklm.google.com/', '_blank');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className={`relative bg-slate-900/50 rounded-xl border ${scoreColor} p-6 mb-6 transition-all hover:bg-slate-900 overflow-hidden`}>
      
      {/* 1. Header Area: Title & Authors */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="bg-slate-800 px-2 py-0.5 rounded text-primary-400 font-mono">
            {paper.publishedDate}
          </span>
          <span>•</span>
          <span className="truncate max-w-[300px]">{paper.authors.slice(0, 3).join(', ')}</span>
        </div>

        <a 
          href={paper.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="group block"
        >
          <h3 className="text-xl md:text-2xl font-bold text-slate-100 leading-tight group-hover:text-primary-400 transition-colors">
            {paper.title}
            <span className="inline-block ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-sm">↗</span>
          </h3>
        </a>
      </div>

      {/* 2. Impact Metrics Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {paper.impactBadge && (
          <div className="bg-gradient-to-r from-primary-600 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 border border-slate-700">
             <svg className="w-3 h-3 text-yellow-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
             {paper.impactBadge}
          </div>
        )}
        
        <div className="bg-slate-800 text-slate-300 text-xs font-medium px-3 py-1 rounded-full border border-slate-700 flex items-center gap-1.5" title="Academic Citations">
          <span className="text-slate-500">引用数:</span>
          <span className="text-white font-bold">{paper.citationCount || 'N/A'}</span>
        </div>

        <div className="bg-slate-800 text-slate-300 text-xs font-medium px-3 py-1 rounded-full border border-slate-700 flex items-center gap-1.5" title="Web/Social Mentions">
          <span className="text-slate-500">Web言及:</span>
          <span className="text-white font-bold">{paper.webMentionCount || 'N/A'}</span>
        </div>
      </div>

      {/* 3. Main Content Split */}
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Text Area */}
        <div className="flex-1 order-2 md:order-1">
          <div className="mb-4">
             <p className="text-lg text-slate-300 italic mb-2 border-l-4 border-primary-500/30 pl-3">
              "{paper.summary}"
             </p>
             <p className="text-xs text-primary-500/80 font-mono uppercase tracking-wider pl-4">
               Reason: {paper.engagementReason}
             </p>
          </div>
          
          <div className="mt-4">
             <details className="text-sm text-slate-500 cursor-pointer group/details">
              <summary className="hover:text-slate-300 transition-colors list-none flex items-center gap-2 font-semibold p-2 rounded hover:bg-slate-800/50 w-fit">
                <span className="group-open/details:rotate-90 transition-transform">▸</span> Read Abstract (Abstract + 日本語訳)
              </summary>
              <div className="mt-3 pl-4 border-l-2 border-slate-700 space-y-4">
                 <div>
                  <h4 className="text-xs text-primary-400 mb-1 uppercase tracking-wider">Japanese Translation</h4>
                  <p className="leading-relaxed text-slate-300">
                    {paper.abstractJa || "Translation not available."}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Original Abstract</h4>
                  <p className="leading-relaxed text-slate-400 italic">
                    {paper.abstract || "No abstract available."}
                  </p>
                </div>
              </div>
            </details>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-2">
            <button 
              onClick={handleNotebookLM}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all border border-slate-700 hover:border-slate-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
              {copied ? 'Copied!' : 'NotebookLM'}
            </button>
             <a 
              href={`https://scholar.google.com/scholar?q=${encodeURIComponent(paper.title)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-all border border-slate-700 hover:border-slate-600"
            >
              Google Scholar
            </a>
          </div>
        </div>

        {/* Image Area - Only if image exists and no error */}
        {paper.imageUrl && !imgError && (
          <div className="w-full md:w-1/3 order-1 md:order-2 flex flex-col justify-start">
             <div className="w-full rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
               <img 
                 src={paper.imageUrl} 
                 alt="Paper figure" 
                 className="w-full h-auto object-cover max-h-64 opacity-90 hover:opacity-100 transition-opacity"
                 onError={() => setImgError(true)}
               />
               <div className="px-2 py-1 text-[10px] text-slate-500 bg-slate-950 text-right">
                 Source Image
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
