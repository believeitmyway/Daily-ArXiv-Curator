
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Paper, FetchStatus, Topic } from './types';
import { findPapers, curateAndParsePapers } from './services/geminiService';
import { getStoredPapers, savePapers, mergePapers, getStoredTopics, saveTopics, deleteTopic, deletePaper } from './services/storageService';
import { Timeline } from './components/Timeline';
import { TopicForm } from './components/TopicForm';

const App: React.FC = () => {
  // Data State
  const [topics, setTopics] = useState<Topic[]>([]);
  const [allPapers, setAllPapers] = useState<Paper[]>([]);
  
  // Keep a ref of allPapers for reading inside async functions without dependency cycles
  const allPapersRef = useRef<Paper[]>([]);
  useEffect(() => { allPapersRef.current = allPapers; }, [allPapers]);

  // UI State
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  
  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Pull to Refresh State
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 1. Initial Load (Async for IndexedDB)
  useEffect(() => {
    const initData = async () => {
      try {
        const [loadedTopics, loadedPapers] = await Promise.all([
          getStoredTopics(),
          getStoredPapers()
        ]);
        
        setTopics(loadedTopics);
        setAllPapers(loadedPapers);

        // Select first topic if available
        if (loadedTopics.length > 0) {
          setSelectedTopicId(loadedTopics[0].id);
        } else {
          setIsSidebarOpen(true);
        }
      } catch (e) {
        console.error("Failed to initialize DB", e);
      } finally {
        setIsInitializing(false);
      }
    };
    initData();
  }, []);

  // 2. Core Fetch Logic
  const fetchPapersForTopic = useCallback(async (topic: Topic) => {
    // Prevent multiple simultaneous fetches
    if (status !== 'idle' && status !== 'complete' && status !== 'error') return;

    setStatus('searching');
    setStatusMessage(`Scanning latest papers for "${topic.title}"...`);

    try {
      // Search
      const searchResultText = await findPapers(topic.searchPrompt);
      
      setStatus('analyzing');
      setStatusMessage('Analyzing relevance & impact...');

      // Curate
      const candidates = await curateAndParsePapers(topic.id, searchResultText);
      
      if (candidates.length === 0) {
        console.log("No new candidates found.");
        setStatus('complete');
        return;
      }

      // Merge back into main state and persist
      const currentPapers = allPapersRef.current;
      const updated = mergePapers(currentPapers, candidates);
      
      // Save to DB (Async)
      await savePapers(updated);
      
      // Update UI
      setAllPapers(updated);

      setStatus('complete');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setStatusMessage('Update failed. Retrying later.');
      setTimeout(() => setStatus('idle'), 5000);
    }
  }, [status]); // Depend on status to prevent re-entry

  // 3. Topic Management (Add / Edit / Delete)
  const handleOpenAdd = () => {
    setEditingTopic(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, topic: Topic) => {
    e.stopPropagation();
    setEditingTopic(topic);
    setIsFormOpen(true);
  };

  const handleDeleteTopic = async (e: React.MouseEvent, topicId: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this topic and its history?")) return;

    // 1. Update State
    const updatedTopics = topics.filter(t => t.id !== topicId);
    setTopics(updatedTopics);

    const papersToDelete = allPapers.filter(p => p.topicId === topicId);
    const updatedPapers = allPapers.filter(p => p.topicId !== topicId);
    setAllPapers(updatedPapers);

    if (selectedTopicId === topicId) {
      setSelectedTopicId(updatedTopics.length > 0 ? updatedTopics[0].id : null);
    }

    // 2. Update DB
    await deleteTopic(topicId);
    // Delete associated papers from DB one by one (or bulk if supported, currently loops in parallel)
    await Promise.all(papersToDelete.map(p => deletePaper(p.id)));
  };

  const handleSaveTopic = async (savedTopic: Topic) => {
    let updatedTopics: Topic[];
    if (editingTopic) {
      updatedTopics = topics.map(t => t.id === savedTopic.id ? savedTopic : t);
    } else {
      updatedTopics = [...topics, savedTopic];
    }
    
    setTopics(updatedTopics);
    await saveTopics(updatedTopics); // Persist to DB
    
    setIsFormOpen(false);
    setEditingTopic(null);
    if (!editingTopic) {
      setSelectedTopicId(savedTopic.id);
    }
  };

  // 4. Trigger Fetch on Topic Selection
  useEffect(() => {
    if (!selectedTopicId || isInitializing) return;
    const topic = topics.find(t => t.id === selectedTopicId);
    if (topic) {
        // Optional: Auto-fetch logic could go here, or just view existing
        // Currently we view existing, manual refresh triggers fetch
    }
  }, [selectedTopicId, isInitializing]); 

  // 5. Manual Refresh Handler
  const handleRefreshClick = () => {
    if (!selectedTopicId) return;
    const topic = topics.find(t => t.id === selectedTopicId);
    if (topic) {
      fetchPapersForTopic(topic);
    }
  };

  // 6. Pull to Refresh Logic
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollContainerRef.current && scrollContainerRef.current.scrollTop === 0) {
      setPullStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartY > 0 && scrollContainerRef.current && scrollContainerRef.current.scrollTop === 0) {
      const touchY = e.touches[0].clientY;
      const diff = touchY - pullStartY;
      if (diff > 0) {
        setPullDistance(Math.min(diff * 0.4, 150)); 
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 80) { 
      handleRefreshClick();
    }
    setPullStartY(0);
    setPullDistance(0);
  };

  // Filter papers
  const currentPapers = allPapers.filter(p => p.topicId === selectedTopicId);
  const activeTopic = topics.find(t => t.id === selectedTopicId);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <p>Loading Library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-primary-500/30 overflow-hidden">
      
      {/* SIDEBAR */}
      <aside 
        className={`${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0 md:opacity-100 md:w-0'} 
        bg-slate-900 border-r border-slate-800 flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out absolute md:relative h-full z-30 shadow-2xl md:shadow-none overflow-hidden`}
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
           <div className="flex items-center gap-2 text-white font-bold text-xl">
             <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded flex items-center justify-center text-sm">
               AI
             </div>
             Curator
           </div>
           {/* Mobile Close Button */}
           <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
           </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Your Topics</div>
          
          {topics.map(t => (
            <div
              key={t.id}
              onClick={() => {
                setSelectedTopicId(t.id);
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
              className={`group flex items-center justify-between w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                selectedTopicId === t.id 
                  ? 'bg-primary-900/30 text-primary-400 border border-primary-500/30' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="truncate">{t.title}</span>
              
              {/* Action Buttons */}
              <div className={`flex items-center gap-1 ${selectedTopicId === t.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                 <button 
                   onClick={(e) => handleOpenEdit(e, t)}
                   className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                   title="Edit Topic"
                 >
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                 </button>
                 <button 
                   onClick={(e) => handleDeleteTopic(e, t.id)}
                   className="p-1 hover:bg-red-900/50 rounded text-slate-500 hover:text-red-400"
                   title="Delete Topic"
                 >
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                 </button>
              </div>
            </div>
          ))}

          {topics.length === 0 && (
            <div className="text-sm text-slate-600 italic px-2">No topics yet.</div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleOpenAdd}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <span>+</span> Add Topic
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 bg-slate-950/80 backdrop-blur z-20">
          
          <div className="flex items-center gap-4">
            {/* Toggle Sidebar Button */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>

            <h2 className="text-lg md:text-xl font-bold text-white truncate max-w-[200px] md:max-w-none">
              {activeTopic ? activeTopic.title : 'Daily ArXiv Curator'}
            </h2>

            {/* Manual Refresh Button */}
             {activeTopic && (
                <button 
                  onClick={handleRefreshClick}
                  disabled={status === 'searching' || status === 'analyzing'}
                  className={`p-2 rounded-full transition-all ${status === 'idle' || status === 'complete' || status === 'error' ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-primary-500 cursor-not-allowed'}`}
                  title="Force Refresh"
                >
                   <svg className={`w-5 h-5 ${status === 'searching' ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                </button>
             )}
          </div>
          
          {/* Status Badge */}
          <div className="flex items-center gap-3">
             {status !== 'idle' && status !== 'complete' && status !== 'error' && (
               <div className="flex items-center gap-2 text-xs text-primary-400 animate-pulse bg-primary-900/20 px-3 py-1 rounded-full">
                 <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
                 <span className="hidden md:inline">{statusMessage}</span>
                 <span className="md:hidden">Updating...</span>
               </div>
             )}
             {status === 'complete' && (
                <div className="text-xs text-slate-500 hidden md:block">Updated just now</div>
             )}
          </div>
        </header>

        {/* Scrollable Timeline Area with Pull-to-Refresh */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 relative bg-slate-950 scroll-smooth"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          
          {/* Pull to Refresh Indicator */}
          <div 
            className="absolute top-0 left-0 w-full flex justify-center pointer-events-none transition-all duration-200 z-10"
            style={{ 
              transform: `translateY(${pullDistance > 0 ? Math.min(pullDistance, 80) : -40}px)`, 
              opacity: pullDistance > 0 ? Math.min(pullDistance / 50, 1) : 0 
            }}
          >
            <div className="bg-slate-800 rounded-full p-2 shadow-lg border border-slate-700">
               {pullDistance > 80 ? (
                 <svg className="w-6 h-6 text-primary-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
               ) : (
                 <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
               )}
            </div>
          </div>

          {/* Add/Edit Topic Modal Overlay */}
          {isFormOpen && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-lg shadow-2xl">
                <TopicForm 
                  initialTopic={editingTopic}
                  onSave={handleSaveTopic} 
                  onCancel={() => { setIsFormOpen(false); setEditingTopic(null); }} 
                />
              </div>
            </div>
          )}

          {/* Empty State */}
          {!activeTopic && !isFormOpen && (
             <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
               <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-slate-700">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
               </div>
               <p className="text-lg font-medium">Select a topic from the sidebar</p>
               <button 
                  onClick={handleOpenAdd}
                  className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
               >
                 Create New Topic
               </button>
             </div>
          )}

          {activeTopic && (
             <Timeline papers={currentPapers} />
          )}

        </div>
      </main>
      
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
