import React, { useMemo } from 'react';
import { Paper, DayGroup } from '../types';
import { PaperCard } from './PaperCard';

interface TimelineProps {
  papers: Paper[];
}

export const Timeline: React.FC<TimelineProps> = ({ papers }) => {
  const groupedPapers = useMemo(() => {
    const groups: DayGroup[] = [];
    
    // Sort papers by date desc, then score desc
    const sorted = [...papers].sort((a, b) => {
      const dateDiff = new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.engagementScore - a.engagementScore;
    });

    sorted.forEach(paper => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === paper.publishedDate) {
        lastGroup.papers.push(paper);
      } else {
        groups.push({ date: paper.publishedDate, papers: [paper] });
      }
    });

    return groups;
  }, [papers]);

  if (papers.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500">
        <p className="text-lg">No papers curated yet.</p>
        <p className="text-sm">Enter a topic above to start your daily feed.</p>
      </div>
    );
  }

  return (
    <div className="relative border-l border-slate-800 ml-4 md:ml-8 space-y-12 pb-20">
      {groupedPapers.map((group) => (
        <div key={group.date} className="relative pl-8 md:pl-12">
          {/* Timeline Dot */}
          <div className="absolute -left-1.5 top-0 w-3 h-3 bg-primary-500 rounded-full shadow-[0_0_10px_#0ea5e9]" />
          
          {/* Date Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">
              {new Date(group.date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', year: 'numeric' })}
            </h2>
            <span className="text-sm text-slate-500 font-mono">
              {group.papers.length} Recommendation{group.papers.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Cards */}
          <div className="space-y-8">
            {group.papers.map(paper => (
              <PaperCard key={paper.id} paper={paper} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
