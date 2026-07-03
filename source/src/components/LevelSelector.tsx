import React, { useState } from "react";
import { Level } from "../types";
import { CheckCircle2, Circle, ArrowRight, Award, ChevronDown, ChevronUp } from "lucide-react";

interface LevelSelectorProps {
  levels: Level[];
  currentLevelId: string;
  completedLevels: string[];
  onSelectLevel: (levelId: string) => void;
}

export const LevelSelector: React.FC<LevelSelectorProps> = ({
  levels,
  currentLevelId,
  completedLevels,
  onSelectLevel,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const completionRate = Math.round((completedLevels.length / levels.length) * 100);

  return (
    <div className="flex flex-col bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm text-slate-700 transition-all duration-350">
      {/* Level Header Stats */}
      <div className="pb-3 border-b border-slate-100 flex flex-col gap-2">
        <div 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center justify-between cursor-pointer group select-none"
        >
          <div className="flex items-center gap-2">
            <Award className="text-indigo-500" size={18} />
            <h2 className="font-sans font-bold text-slate-800 text-xs tracking-wider uppercase">Your Jujutsu Journey</h2>
          </div>
          <div className="text-slate-400 group-hover:text-indigo-500 transition-colors">
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </div>
        </div>

        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-bold tracking-widest mt-1">
          <span>PROGRESS</span>
          <span>{completedLevels.length} / {levels.length} LEVELS</span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-indigo-600 h-full transition-all duration-500 rounded-full"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* Levels list (collapsible) */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[220px] mt-4 pr-1 custom-scrollbar animate-fade-in">
          {levels.map((lvl) => {
            const isSelected = lvl.id === currentLevelId;
            const isCompleted = completedLevels.includes(lvl.id);

            return (
              <button
                key={lvl.id}
                onClick={() => onSelectLevel(lvl.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all duration-200 flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? "bg-indigo-50/40 border-indigo-200 text-slate-800 shadow-sm shadow-indigo-100/5"
                    : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/60"
                }`}
              >
                <div className="flex items-start gap-2.5 max-w-[85%]">
                  <div className="mt-0.5">
                    {isCompleted ? (
                      <CheckCircle2 className="text-emerald-500 shrink-0" size={16} />
                    ) : (
                      <Circle className="text-slate-300 shrink-0" size={16} />
                    )}
                  </div>
                  <div className="truncate">
                    <div className={`font-sans font-bold text-xs ${isSelected ? "text-indigo-900" : "text-slate-800"}`}>
                      {lvl.title}
                    </div>
                    <div className="font-sans text-[10.5px] text-slate-400 truncate mt-0.5">
                      {lvl.subtitle}
                    </div>
                  </div>
                </div>
                <ArrowRight
                  size={14}
                  className={`text-slate-400 transition-transform ${
                    isSelected ? "translate-x-1 text-indigo-500" : "opacity-0 group-hover:opacity-100"
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
