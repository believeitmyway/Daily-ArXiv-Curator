import React, { useState, useEffect } from 'react';
import { Topic } from '../types';

interface TopicFormProps {
  initialTopic?: Topic | null; // If provided, we are in Edit mode
  onSave: (topic: Topic) => void;
  onCancel: () => void;
}

export const TopicForm: React.FC<TopicFormProps> = ({ initialTopic, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    if (initialTopic) {
      setTitle(initialTopic.title);
      setPrompt(initialTopic.searchPrompt);
    } else {
      setTitle('');
      setPrompt('');
    }
  }, [initialTopic]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !prompt.trim()) return;

    const newTopic: Topic = {
      id: initialTopic ? initialTopic.id : Date.now().toString(),
      title: title.trim(),
      searchPrompt: prompt.trim(),
      lastUpdated: initialTopic ? initialTopic.lastUpdated : undefined,
    };

    onSave(newTopic);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 mb-6 animate-fade-in">
      <h3 className="text-lg font-bold text-white mb-4">
        {initialTopic ? 'Edit Topic' : 'Add New Research Topic'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Topic Title</label>
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:ring-2 focus:ring-primary-500 outline-none"
            placeholder="e.g. Agentic AI Security"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Search Prompt (Natural Language)</label>
          <textarea
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:ring-2 focus:ring-primary-500 outline-none h-24 text-sm"
            placeholder="e.g. Find latest papers on adversarial attacks against LLM agents, focusing on jailbreaks..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded text-sm font-bold">
            {initialTopic ? 'Save Changes' : 'Create Topic'}
          </button>
        </div>
      </form>
    </div>
  );
};
