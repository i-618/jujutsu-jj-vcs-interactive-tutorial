import React, { useState, useRef, useEffect } from "react";
import { TerminalLine } from "../types";
import { Terminal as TerminalIcon, Play, HelpCircle } from "lucide-react";

interface TerminalProps {
  lines: TerminalLine[];
  onCommand: (cmd: string) => void;
  onClear: () => void;
  currentWcChangeId: string;
}

export const Terminal: React.FC<TerminalProps> = ({
  lines,
  onCommand,
  onClear,
  currentWcChangeId,
}) => {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom on new output
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  // Keep focus in input
  const handleContainerClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const cmd = input.trim();
      if (cmd) {
        onCommand(cmd);
        setHistory(prev => [...prev, cmd]);
        setInput("");
      }
      setHistoryIdx(-1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const newIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(newIdx);
        setInput(history[newIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx !== -1) {
        const newIdx = historyIdx + 1;
        if (newIdx >= history.length) {
          setHistoryIdx(-1);
          setInput("");
        } else {
          setHistoryIdx(newIdx);
          setInput(history[newIdx]);
        }
      }
    }
  };

  return (
    <div
      onClick={handleContainerClick}
      className="flex flex-col h-full min-h-0 bg-slate-900 border border-slate-200/60 rounded-xl overflow-hidden font-mono text-sm shadow-sm text-slate-300 relative"
    >
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 select-none">
        <div className="flex items-center gap-2">
          <TerminalIcon size={14} className="text-slate-500" />
          <span className="text-xs text-slate-400 font-bold tracking-wider uppercase">Jujutsu Virtual Terminal</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="text-[10px] px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded transition cursor-pointer"
        >
          Clear
        </button>
      </div>

      {/* Terminal Content Lines */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-900/95"
      >
        <div className="text-slate-500 text-xs mb-3 border-b border-slate-800/60 pb-2">
          Type Jujutsu commands here. Example: <code className="text-indigo-400 bg-slate-950/50 px-1 py-0.5 rounded font-normal font-mono">jj status</code> or <code className="text-indigo-400 bg-slate-950/50 px-1 py-0.5 rounded font-normal font-mono">jj log</code>.
          <br />Type <code className="text-amber-400 bg-slate-950/50 px-1 py-0.5 rounded font-normal font-mono">help</code> to list all simulated operations.
        </div>

        {lines.map((line, idx) => {
          let colorClass = "text-slate-300";
          if (line.type === "input") {
            colorClass = "text-indigo-300 font-semibold";
          } else if (line.type === "error") {
            colorClass = "text-red-400 bg-red-950/20 px-2 py-1 rounded border border-red-900/30";
          } else if (line.type === "success") {
            colorClass = "text-emerald-300 bg-emerald-950/20 px-2 py-1 rounded border border-emerald-900/30";
          } else if (line.type === "system") {
            colorClass = "text-slate-500 italic";
          } else if (line.type === "output") {
            colorClass = "text-slate-200 whitespace-pre-wrap leading-relaxed";
          }

          return (
            <div key={idx} className={`${colorClass}`}>
              {line.type === "input" && (
                <span className="text-slate-500 mr-2">
                  jj @ <span className="text-indigo-400 font-bold">{currentWcChangeId.slice(0, 4)}</span> &gt;
                </span>
              )}
              {line.text}
            </div>
          );
        })}
      </div>

      {/* Input Prompt Bar */}
      <div className="flex items-center px-4 py-2 bg-slate-950 border-t border-slate-800">
        <span className="text-slate-500 font-bold mr-2 select-none">
          jj @ <span className="text-indigo-400 font-bold">{currentWcChangeId.slice(0, 4)}</span> &gt;
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type 'jj log' or 'jj status'..."
          className="flex-1 bg-transparent text-indigo-300 font-semibold focus:outline-none placeholder-slate-700"
          autoFocus
        />
        <button
          onClick={() => {
            const cmd = input.trim();
            if (cmd) {
              onCommand(cmd);
              setHistory(prev => [...prev, cmd]);
              setInput("");
            }
          }}
          className="text-indigo-400 hover:text-indigo-300 p-1 cursor-pointer"
        >
          <Play size={14} fill="currentColor" />
        </button>
      </div>
    </div>
  );
};
