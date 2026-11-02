import React from 'react';
import { Brain, Sparkles, BookOpen } from 'lucide-react';

export interface MemoryPanelProps {
  lessons?: string[];
  sessionId?: string;
}

export function MemoryPanel({ lessons = [], sessionId }: MemoryPanelProps) {
  return (
    <div className="p-4 bg-[#0b1120] h-full overflow-y-auto rounded-xl border border-slate-800">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
        <h3 className="text-sm font-bold text-pink-400 flex items-center gap-2">
          <Brain className="w-4 h-4 text-pink-400" /> ZYNTHEOR MEMORY (Lessons Learned)
        </h3>
        {sessionId && (
          <span className="text-[10px] text-slate-500 font-mono">
            Session: {sessionId.slice(0, 8)}
          </span>
        )}
      </div>

      {lessons.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500">
          <BookOpen className="w-8 h-8 mb-2 opacity-40 text-pink-400" />
          <p className="text-xs italic">No memories yet. The agent is still learning.</p>
          <span className="text-[10px] text-slate-600 mt-1">
            Lessons from execution errors and retries will appear here.
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson, idx) => (
            <div
              key={`lesson-${idx}`}
              className="bg-pink-500/5 border border-pink-500/20 p-3 rounded-lg text-xs text-slate-300 font-mono flex items-start gap-2.5 transition-all hover:bg-pink-500/10"
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 whitespace-pre-wrap leading-relaxed">
                {lesson}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MemoryPanel;
