import React, { useState, useEffect } from "react";
import { levels } from "./levels";
import { RepoState, TerminalLine } from "./types";
import { GraphView } from "./components/GraphView";
import { Terminal } from "./components/Terminal";
import { LevelSelector } from "./components/LevelSelector";
import {
  findCommit,
  newCommit,
  describeCommit,
  squashCommit,
  rebaseCommit,
  duplicateCommit,
  setBookmark,
  deleteBookmark,
  updateWorkingCopyFiles,
  cloneRepoState,
  abandonCommit,
  editCommit,
} from "./simulator";
import {
  BookOpen,
  CheckCircle,
  Award,
  BookMarked,
  Info,
  ChevronRight,
  ChevronDown,
  FileCode,
  RefreshCw,
  Plus,
  Trash2,
} from "lucide-react";

export default function App() {
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const currentLevel = levels[currentLevelIdx];

  // Repository simulation states
  const [repoState, setRepoState] = useState<RepoState>(cloneRepoState(currentLevel.startState));
  const [undoStack, setUndoStack] = useState<RepoState[]>([]);
  
  // Completed levels tracking
  const [completedLevels, setCompletedLevels] = useState<string[]>([]);
  const [levelStatus, setLevelStatus] = useState<{ solved: boolean; message: string }>({
    solved: false,
    message: "",
  });

  // Terminal state
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    { text: "Jujutsu (jj) shell initialized.", type: "system" },
    { text: `Welcome to Level: ${currentLevel.title}. Type 'help' to see available commands.`, type: "system" },
  ]);

  // Virtual file editor states
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [showAddFileDialog, setShowAddFileDialog] = useState(false);
  const [isWorkingCopyEditorCollapsed, setIsWorkingCopyEditorCollapsed] = useState(true);

  // Initialize level
  useEffect(() => {
    setRepoState(cloneRepoState(currentLevel.startState));
    setUndoStack([]);
    setSelectedFile(null);
    setFileContent("");
    setTerminalLines([
      { text: `Switched to Level: ${currentLevel.title}`, type: "system" },
      { text: currentLevel.subtitle, type: "system" },
      { text: "Type 'help' to see supported commands.", type: "system" },
    ]);
    setLevelStatus({ solved: false, message: "" });
  }, [currentLevelIdx]);

  // Run validation whenever repoState changes
  useEffect(() => {
    const res = currentLevel.validate(repoState);
    setLevelStatus({ solved: res.success, message: res.message });
    if (res.success && !completedLevels.includes(currentLevel.id)) {
      setCompletedLevels(prev => [...prev, currentLevel.id]);
    }
  }, [repoState, currentLevelIdx]);

  // Working copy helper
  const workingCopy = repoState.commits[repoState.workingCopyId];
  const filesList = workingCopy ? Object.keys(workingCopy.files) : [];

  // Update editor file selection when file list changes
  useEffect(() => {
    if (filesList.length > 0 && !selectedFile) {
      setSelectedFile(filesList[0]);
      setFileContent(workingCopy.files[filesList[0]] || "");
    } else if (selectedFile && workingCopy) {
      setFileContent(workingCopy.files[selectedFile] || "");
    } else {
      setSelectedFile(null);
      setFileContent("");
    }
  }, [repoState.workingCopyId, filesList.length]);

  // Handle manual file edits (Auto-Commit Simulation)
  const handleFileChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setFileContent(newContent);
    if (selectedFile) {
      // Push history state for undo
      setUndoStack(prev => [...prev, cloneRepoState(repoState)]);
      const updatedState = updateWorkingCopyFiles(repoState, { [selectedFile]: newContent });
      setRepoState(updatedState);
      
      // Print notification in terminal
      setTerminalLines(prev => [
        ...prev,
        { text: `[Working Copy Auto-Commit] Updated file '${selectedFile}'`, type: "system" }
      ]);
    }
  };

  const handleAddFile = () => {
    const name = newFileName.trim();
    if (name) {
      setUndoStack(prev => [...prev, cloneRepoState(repoState)]);
      const updatedState = updateWorkingCopyFiles(repoState, { [name]: "" });
      setRepoState(updatedState);
      setSelectedFile(name);
      setFileContent("");
      setNewFileName("");
      setShowAddFileDialog(false);
      setTerminalLines(prev => [
        ...prev,
        { text: `[Working Copy Auto-Commit] Created file '${name}'`, type: "system" }
      ]);
    }
  };

  const handleDeleteFile = (name: string) => {
    if (workingCopy) {
      setUndoStack(prev => [...prev, cloneRepoState(repoState)]);
      const newFiles = { ...workingCopy.files };
      delete newFiles[name];
      const updatedState = cloneRepoState(repoState);
      updatedState.commits[updatedState.workingCopyId].files = newFiles;
      setRepoState(updatedState);
      if (selectedFile === name) {
        setSelectedFile(null);
      }
      setTerminalLines(prev => [
        ...prev,
        { text: `[Working Copy Auto-Commit] Deleted file '${name}'`, type: "system" }
      ]);
    }
  };

  // Generate ASCII commit tree log
  const generateAsciiLog = (state: RepoState): string => {
    let output = "";
    const list = Object.values(state.commits);
    
    // Sort descendants to newest first
    const heights: { [id: string]: number } = {};
    const getH = (id: string): number => {
      if (id in heights) return heights[id];
      const commit = state.commits[id];
      if (!commit || commit.parents.length === 0) return 0;
      heights[id] = Math.max(...commit.parents.map(p => getH(p))) + 1;
      return heights[id];
    };
    list.forEach(c => getH(c.id));
    list.sort((a, b) => (heights[b.id] || 0) - (heights[a.id] || 0));

    list.forEach((c) => {
      const isWc = c.isWorkingCopy;
      const marker = isWc ? "@" : c.isConflicted ? "x" : "o";
      const changeIdShort = c.changeId.slice(0, 4);
      const commitIdShort = c.id.slice(0, 4);
      
      // Get bookmarks
      const bmarks = Object.entries(state.bookmarks)
        .filter(([_, cid]) => cid === c.id)
        .map(([name]) => name);
      const bookmarkSuffix = bmarks.length > 0 ? ` [${bmarks.join(", ")}]` : "";

      const desc = c.description ? ` "${c.description}"` : " (no description)";
      const isRoot = c.id === "00000000";

      if (isRoot) {
        output += `o  zzzzzzzz (root)\n`;
      } else {
        output += `${marker}  ${changeIdShort} (${commitIdShort}) ${desc}${bookmarkSuffix}\n`;
        output += `│\n`;
      }
    });

    return output;
  };

  // Command Parser Engine
  const executeCommand = (fullCmd: string) => {
    const trimmed = fullCmd.trim();
    if (!trimmed) return;

    // Append raw input line
    setTerminalLines(prev => [...prev, { text: trimmed, type: "input" }]);

    const args = trimmed.split(/\s+/);
    const base = args[0].toLowerCase();

    if (base === "clear") {
      setTerminalLines([]);
      return;
    }

    if (base === "help") {
      setTerminalLines(prev => [
        ...prev,
        {
          text: `Supported commands:
  • jj status / jj st    - Show working copy status
  • jj log / jj l       - Show ASCII revision history graph
  • jj describe -m "..." - Describe active commit @ (change message)
  • jj new [rev]        - Create a new commit on top of current/revision
  • jj squash           - Squash active changes into parent commit
  • jj rebase -d <dest> - Rebase onto a destination bookmark/commit
  • jj duplicate <rev>  - Duplicate a commit
  • jj abandon [rev]    - Abandon a commit, rebasing children onto its parent
  • jj edit <rev>       - Edit an existing historical commit directly
  • jj diff             - Show file differences compared to parent
  • jj bookmark create <name> [rev]  - Create a branch label
  • jj bookmark delete <name>       - Delete a branch label
  • jj undo             - Undo the last transaction
  • clear               - Clear terminal output`,
          type: "output",
        },
      ]);
      return;
    }

    // Must be a 'jj' command
    if (base !== "jj") {
      setTerminalLines(prev => [
        ...prev,
        { text: `Error: Unknown command. Type 'help' to see list of supported commands.`, type: "error" },
      ]);
      return;
    }

    const sub = args[1]?.toLowerCase();
    if (!sub) {
      setTerminalLines(prev => [...prev, { text: `Error: 'jj' requires a subcommand (e.g., jj log, jj status).`, type: "error" }]);
      return;
    }

    // 1. STATUS
    if (sub === "status" || sub === "st") {
      const wc = repoState.commits[repoState.workingCopyId];
      if (!wc) {
        setTerminalLines(prev => [...prev, { text: `Error: No working copy found.`, type: "error" }]);
        return;
      }
      
      const parentId = wc.parents[0] || "none";
      const parentCommit = repoState.commits[parentId];
      const parentDesc = parentCommit ? `(${parentCommit.changeId.slice(0,4)}) "${parentCommit.description || "(no description)"}"` : "none";

      const fileStatus = Object.keys(wc.files).length > 0
        ? Object.keys(wc.files).map(f => `  • M  ${f}`).join("\n")
        : "  (no modified files)";

      setTerminalLines(prev => [
        ...prev,
        {
          text: `Working copy: @ ${wc.changeId.slice(0, 4)} (${wc.id.slice(0, 4)}) ${wc.description ? `"${wc.description}"` : "(no description)"}
Parent commit: ${parentDesc}
Working copy files:
${fileStatus}
${wc.isConflicted ? `\n⚠️  WARNING: Commit contains first-class conflicts! Resolve by editing conflicted files.` : ""}`,
          type: "output",
        },
      ]);
      return;
    }

    // 2. LOG
    if (sub === "log" || sub === "l") {
      const logText = generateAsciiLog(repoState);
      setTerminalLines(prev => [...prev, { text: logText, type: "output" }]);
      return;
    }

    // 3. DESCRIBE
    if (sub === "describe" || sub === "desc") {
      // Find -m argument
      const mIdx = args.indexOf("-m");
      if (mIdx === -1 || mIdx === args.length - 1) {
        setTerminalLines(prev => [...prev, { text: `Error: 'jj describe' requires a message parameter: -m "message"`, type: "error" }]);
        return;
      }
      
      // Parse full description inside quotes or words
      const msgWords = args.slice(mIdx + 1);
      let desc = msgWords.join(" ").replace(/^["']|["']$/g, ""); // strip quotes

      // Check if revision target specified before -m
      let revTarget = "@";
      if (mIdx > 2) {
        revTarget = args[2];
      }

      const targetCommit = findCommit(repoState, revTarget);
      if (!targetCommit) {
        setTerminalLines(prev => [...prev, { text: `Error: Target revision not found: ${revTarget}`, type: "error" }]);
        return;
      }

      setUndoStack(prev => [...prev, cloneRepoState(repoState)]);
      const newState = describeCommit(repoState, revTarget, desc);
      setRepoState(newState);

      setTerminalLines(prev => [
        ...prev,
        { text: `Described commit ${targetCommit.changeId.slice(0, 4)} as "${desc}".`, type: "success" },
      ]);
      return;
    }

    // 4. NEW
    if (sub === "new") {
      const parentArg = args[2]; // Optional parent
      setUndoStack(prev => [...prev, cloneRepoState(repoState)]);
      try {
        const newState = newCommit(repoState, parentArg);
        setRepoState(newState);
        const newWc = newState.commits[newState.workingCopyId];
        setTerminalLines(prev => [
          ...prev,
          { text: `Created new working copy commit @ ${newWc.changeId.slice(0,4)} on top of parent.`, type: "success" },
        ]);
      } catch (err: any) {
        setTerminalLines(prev => [...prev, { text: `Error: ${err.message}`, type: "error" }]);
      }
      return;
    }

    // 5. SQUASH
    if (sub === "squash" || sub === "sq") {
      // Squash current changes into parent
      setUndoStack(prev => [...prev, cloneRepoState(repoState)]);
      const { newState, message } = squashCommit(repoState, "@");
      if (newState === repoState) {
        setTerminalLines(prev => [...prev, { text: message, type: "error" }]);
      } else {
        setRepoState(newState);
        setTerminalLines(prev => [...prev, { text: message, type: "success" }]);
      }
      return;
    }

    // 6. REBASE
    if (sub === "rebase") {
      // Find destination (-d)
      const dIdx = args.indexOf("-d");
      if (dIdx === -1 || dIdx === args.length - 1) {
        setTerminalLines(prev => [...prev, { text: `Error: 'jj rebase' requires a destination option: -d <dest_rev>`, type: "error" }]);
        return;
      }
      const destQuery = args[dIdx + 1];

      // Optional source (-s)
      const sIdx = args.indexOf("-s");
      let srcQuery = "@";
      if (sIdx !== -1 && sIdx < args.length - 1) {
        srcQuery = args[sIdx + 1];
      }

      setUndoStack(prev => [...prev, cloneRepoState(repoState)]);
      const { newState, message } = rebaseCommit(repoState, srcQuery, destQuery);
      if (newState === repoState) {
        setTerminalLines(prev => [...prev, { text: message, type: "error" }]);
      } else {
        setRepoState(newState);
        setTerminalLines(prev => [...prev, { text: message, type: "success" }]);
      }
      return;
    }

    // 7. DUPLICATE
    if (sub === "duplicate") {
      const rev = args[2] || "@";
      setUndoStack(prev => [...prev, cloneRepoState(repoState)]);
      const { newState, message } = duplicateCommit(repoState, rev);
      if (newState === repoState) {
        setTerminalLines(prev => [...prev, { text: message, type: "error" }]);
      } else {
        setRepoState(newState);
        setTerminalLines(prev => [...prev, { text: message, type: "success" }]);
      }
      return;
    }

    // 8. BOOKMARK
    if (sub === "bookmark") {
      const op = args[2]?.toLowerCase();
      if (!op) {
        setTerminalLines(prev => [...prev, { text: `Error: 'bookmark' requires an operation: create, delete.`, type: "error" }]);
        return;
      }

      const bName = args[3];
      if (!bName) {
        setTerminalLines(prev => [...prev, { text: `Error: Please specify bookmark name (e.g., jj bookmark create feature-1).`, type: "error" }]);
        return;
      }

      if (op === "create" || op === "set") {
        const rev = args[4]; // Optional revision target
        setUndoStack(prev => [...prev, cloneRepoState(repoState)]);
        const { newState, message } = setBookmark(repoState, bName, rev);
        setRepoState(newState);
        setTerminalLines(prev => [...prev, { text: message, type: "success" }]);
      } else if (op === "delete") {
        setUndoStack(prev => [...prev, cloneRepoState(repoState)]);
        const { newState, message } = deleteBookmark(repoState, bName);
        if (newState === repoState) {
          setTerminalLines(prev => [...prev, { text: message, type: "error" }]);
        } else {
          setRepoState(newState);
          setTerminalLines(prev => [...prev, { text: message, type: "success" }]);
        }
      } else {
        setTerminalLines(prev => [...prev, { text: `Error: Unknown bookmark operation '${op}'`, type: "error" }]);
      }
      return;
    }

    // 9. UNDO
    if (sub === "undo") {
      if (undoStack.length > 0) {
        const prevState = undoStack[undoStack.length - 1];
        setUndoStack(prev => prev.slice(0, -1));
        setRepoState(prevState);
        setTerminalLines(prev => [
          ...prev,
          { text: "Successfully undid the last transaction! (Operation log restored)", type: "success" },
        ]);
      } else {
        setTerminalLines(prev => [...prev, { text: "Error: No transaction history available to undo.", type: "error" }]);
      }
      return;
    }

    // 10. ABANDON
    if (sub === "abandon") {
      const rev = args[2] || "@";
      setUndoStack(prev => [...prev, cloneRepoState(repoState)]);
      const { newState, message } = abandonCommit(repoState, rev);
      if (newState === repoState) {
        setTerminalLines(prev => [...prev, { text: message, type: "error" }]);
      } else {
        setRepoState(newState);
        setTerminalLines(prev => [...prev, { text: message, type: "success" }]);
      }
      return;
    }

    // 11. EDIT
    if (sub === "edit") {
      const rev = args[2];
      if (!rev) {
        setTerminalLines(prev => [...prev, { text: `Error: 'jj edit' requires a revision argument: jj edit <rev>`, type: "error" }]);
        return;
      }
      setUndoStack(prev => [...prev, cloneRepoState(repoState)]);
      const { newState, message } = editCommit(repoState, rev);
      if (newState === repoState) {
        setTerminalLines(prev => [...prev, { text: message, type: "error" }]);
      } else {
        setRepoState(newState);
        setTerminalLines(prev => [...prev, { text: message, type: "success" }]);
      }
      return;
    }

    // 12. DIFF
    if (sub === "diff") {
      const wc = repoState.commits[repoState.workingCopyId];
      if (!wc) {
        setTerminalLines(prev => [...prev, { text: `Error: No working copy found.`, type: "error" }]);
        return;
      }
      
      const parentId = wc.parents[0];
      const parent = repoState.commits[parentId];
      const parentFiles = parent ? parent.files : {};
      const wcFiles = wc.files;

      let diffOutput = "";
      const allFiles = Array.from(new Set([...Object.keys(parentFiles), ...Object.keys(wcFiles)]));

      allFiles.forEach(file => {
        const parentVal = parentFiles[file];
        const wcVal = wcFiles[file];

        if (parentVal === undefined) {
          diffOutput += `+++ Added file: ${file}\n`;
          if (wcVal) {
            diffOutput += wcVal.split("\n").map(line => `+ ${line}`).join("\n") + "\n";
          }
        } else if (wcVal === undefined) {
          diffOutput += `--- Deleted file: ${file}\n`;
          diffOutput += parentVal.split("\n").map(line => `- ${line}`).join("\n") + "\n";
        } else if (parentVal !== wcVal) {
          diffOutput += `Modified file: ${file}\n`;
          const pLines = parentVal.split("\n");
          const wLines = wcVal.split("\n");
          pLines.forEach(line => {
            if (!wLines.includes(line)) {
              diffOutput += `- ${line}\n`;
            }
          });
          wLines.forEach(line => {
            if (!pLines.includes(line)) {
              diffOutput += `+ ${line}\n`;
            }
          });
        }
      });

      if (!diffOutput) {
        diffOutput = "No changes.";
      }

      setTerminalLines(prev => [...prev, { text: diffOutput, type: "output" }]);
      return;
    }

    setTerminalLines(prev => [
      ...prev,
      { text: `Error: Unknown Jujutsu subcommand '${sub}'. Type 'help' to see list of supported commands.`, type: "error" },
    ]);
  };

  const handleNextLevel = () => {
    if (currentLevelIdx < levels.length - 1) {
      setCurrentLevelIdx(prev => prev + 1);
    }
  };

  const resetCurrentLevel = () => {
    setRepoState(cloneRepoState(currentLevel.startState));
    setUndoStack([]);
    setSelectedFile(null);
    setFileContent("");
    setTerminalLines(prev => [
      ...prev,
      { text: "Reset level to starting state.", type: "system" }
    ]);
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#fafafa] text-slate-800 flex flex-col font-sans">
      {/* Main Header Nav */}
      <header className="px-8 bg-white border-b border-slate-200/80 flex items-center justify-between select-none h-16 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 flex items-center justify-center rounded-md font-bold text-white text-lg select-none shadow-sm shadow-indigo-100">
            jj
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-800 flex items-center gap-1.5 font-sans">
              Jujutsu Academy
              <span className="text-[9px] px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-mono font-bold tracking-wider uppercase">Interactive Simulator</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-sans">
              A modern, Git-compatible version control system built for human speed.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] text-slate-500">
            <Info size={13} className="text-indigo-500 shrink-0" />
            <span>The working copy commit <strong>@</strong> is fully automatic in jj.</span>
          </div>

          <button
            onClick={resetCurrentLevel}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs text-slate-600 rounded-lg transition bg-white font-medium cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>Reset Level</span>
          </button>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 lg:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch min-h-0 overflow-y-auto lg:overflow-hidden">
        
        {/* LEFT COLUMN: Lesson Info, Goals, Level List (Span 5) */}
        <div className="lg:col-span-5 flex flex-col gap-4 lg:h-full lg:min-h-0">
          
          {/* Active Level Card */}
          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm flex flex-col lg:flex-1 lg:min-h-0">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="text-indigo-600" size={16} />
                <span className="text-xs text-slate-500 font-mono uppercase font-bold tracking-wider">Lesson Brief</span>
              </div>
              <span className="text-xs font-mono text-slate-400">{currentLevelIdx + 1} / {levels.length}</span>
            </div>

            <div className="p-5 flex-1 lg:min-h-0 lg:overflow-y-auto custom-scrollbar">
              <h2 className="text-base font-bold text-slate-800 tracking-tight leading-snug">
                {currentLevel.title}
              </h2>
              <p className="text-xs text-slate-400 mt-1 italic font-sans leading-relaxed">
                {currentLevel.subtitle}
              </p>

              {/* Lesson Rich Description */}
              <div
                className="text-xs text-slate-600 mt-4 leading-relaxed border-t border-slate-100 pt-4"
                dangerouslySetInnerHTML={{ __html: currentLevel.description }}
              />

              {/* Targets / Goals List */}
              <div className="mt-5 p-4 bg-slate-50 border border-slate-100 rounded-lg">
                <h3 className="text-xs font-bold text-slate-500 font-mono tracking-wider uppercase mb-3 flex items-center gap-1.5">
                  <BookMarked size={12} className="text-indigo-500" />
                  Your Objectives
                </h3>
                <ul className="space-y-3">
                  {currentLevel.goals.map((g, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-600">
                      <div className="mt-0.5 shrink-0">
                        {levelStatus.solved ? (
                          <CheckCircle className="text-emerald-500" size={14} />
                        ) : (
                          <ChevronRight className="text-slate-300" size={14} />
                        )}
                      </div>
                      <span dangerouslySetInnerHTML={{ __html: g }} />
                    </li>
                  ))}
                </ul>
              </div>

              {/* Win State Overlay banner */}
              {levelStatus.solved ? (
                <div className="mt-5 p-4 bg-emerald-50 border border-emerald-100 rounded-lg flex flex-col gap-3">
                  <div className="flex items-start gap-2.5 text-emerald-800 text-xs">
                    <CheckCircle className="mt-0.5 shrink-0 text-emerald-600" size={16} />
                    <div>
                      <span className="font-bold">Challenge Completed!</span>
                      <p className="text-emerald-700 mt-0.5 text-[11px] leading-relaxed">
                        {levelStatus.message}
                      </p>
                    </div>
                  </div>
                  {currentLevelIdx < levels.length - 1 ? (
                    <button
                      onClick={handleNextLevel}
                      className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-semibold text-xs rounded-lg transition shadow-sm cursor-pointer"
                    >
                      <span>Continue to Next Level</span>
                      <ChevronRight size={14} />
                    </button>
                  ) : (
                    <div className="text-center py-2 text-xs font-semibold text-amber-700 flex items-center justify-center gap-1.5">
                      <Award size={16} />
                      <span>Congratulations! You completed the Jujutsu Demo course!</span>
                    </div>
                  )}
                </div>
              ) : (
                currentLevel.hint && (
                  <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-start gap-2 text-[11px] text-slate-500">
                    <Info size={14} className="text-indigo-500 mt-0.5 shrink-0" />
                    <span className="font-mono leading-relaxed whitespace-pre-line">{currentLevel.hint}</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Levels Select Panel */}
          <LevelSelector
            levels={levels}
            currentLevelId={currentLevel.id}
            completedLevels={completedLevels}
            onSelectLevel={(id) => {
              const idx = levels.findIndex(l => l.id === id);
              if (idx !== -1) setCurrentLevelIdx(idx);
            }}
          />
        </div>

        {/* CENTER COLUMN: Visualizer, File Editor, Terminal (Span 7) */}
        <div className="lg:col-span-7 flex flex-col gap-4 lg:h-full lg:min-h-0">
          
          {/* Commit Graph */}
          <GraphView
            repoState={repoState}
            className={isWorkingCopyEditorCollapsed ? "h-[430px]" : "h-[250px]"}
          />

          {/* Virtual File system editor (Unique Auto-commit Demonstrator) */}
          <div className={`bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm flex flex-col shrink-0 transition-[height] duration-200 ${isWorkingCopyEditorCollapsed ? "h-14" : "h-[230px]"}`}>
            <div className={`px-5 py-3 bg-slate-50 flex items-center justify-between shrink-0 ${isWorkingCopyEditorCollapsed ? "" : "border-b border-slate-100"}`}>
              <div className="flex items-center gap-2">
                <FileCode className="text-indigo-600" size={15} />
                <div>
                  <h2 className="font-sans font-bold text-slate-850 text-xs tracking-wider uppercase">Virtual Working Copy Editor</h2>
                  <p className="text-[10px] text-indigo-600 font-mono mt-0.5">Auto-committing edits directly to @ draft in background</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isWorkingCopyEditorCollapsed && (
                  <button
                    onClick={() => setShowAddFileDialog(true)}
                    className="flex items-center gap-1 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 rounded font-semibold tracking-wide transition font-sans cursor-pointer shadow-sm shadow-indigo-100"
                  >
                    <Plus size={12} />
                    <span>New File</span>
                  </button>
                )}
                <button
                  type="button"
                  aria-expanded={!isWorkingCopyEditorCollapsed}
                  onClick={() => setIsWorkingCopyEditorCollapsed(prev => !prev)}
                  className="flex items-center gap-1 text-[11px] border border-slate-200 hover:border-slate-300 hover:bg-white text-slate-600 px-2.5 py-1.5 rounded font-semibold tracking-wide transition font-sans cursor-pointer"
                >
                  <ChevronDown
                    size={13}
                    className={`transition-transform ${isWorkingCopyEditorCollapsed ? "-rotate-90" : "rotate-0"}`}
                  />
                  <span>{isWorkingCopyEditorCollapsed ? "Show" : "Hide"}</span>
                </button>
              </div>
            </div>

            {!isWorkingCopyEditorCollapsed && (
            <div className="p-4 flex flex-col md:flex-row gap-4 flex-1 min-h-0">
              {/* Left pane: File list */}
              <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-100 pb-3 md:pb-0 pr-0 md:pr-3 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar">
                {filesList.length === 0 ? (
                  <div className="text-[11px] text-slate-400 italic p-3 text-center border border-dashed border-slate-200 rounded-lg">
                    No files yet. Click 'New File' to test jj.
                  </div>
                ) : (
                  filesList.map(f => (
                    <div
                      key={f}
                      onClick={() => setSelectedFile(f)}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition border ${
                        selectedFile === f
                          ? "bg-indigo-50/40 text-indigo-700 border-indigo-150"
                          : "hover:bg-slate-50 text-slate-600 border-transparent"
                      }`}
                    >
                      <span className="truncate max-w-[80%] font-mono">{f}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(f);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-0.5 transition cursor-pointer"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Right pane: Interactive file text editor */}
              <div className="flex-1 flex flex-col h-full bg-slate-50/50 rounded-lg border border-slate-100 p-3 overflow-hidden">
                {selectedFile ? (
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-100 pb-1.5 mb-2 select-none">
                      <span>EDITING: {selectedFile}</span>
                      <span className="text-indigo-600 animate-pulse">● Auto-Syncing</span>
                    </div>
                    <textarea
                      value={fileContent}
                      onChange={handleFileChange}
                      placeholder="Write some code or text here. It will immediately and automatically commit to the open working-copy draft commit (@) in Jujutsu!"
                      className="flex-1 bg-transparent text-xs text-slate-700 font-mono resize-none focus:outline-none custom-scrollbar"
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 text-xs p-4">
                    <FileCode size={24} className="text-slate-300 mb-2" />
                    <span>Select an existing file or create a new file above to edit files in your automatic working-copy commit.</span>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>

          {/* New File Creation Dialog Overlay */}
          {showAddFileDialog && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-6 shadow-xl">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5 font-sans">
                  <FileCode size={16} className="text-indigo-600" />
                  Create Virtual File
                </h3>
                <p className="text-xs text-slate-500 mb-4 font-sans leading-relaxed">
                  Name your new virtual file. It will be added to your current working directory and automatically committed directly into your active draft commit (<strong>@</strong>).
                </p>
                <input
                  type="text"
                  placeholder="e.g. index.js, README.md"
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleAddFile();
                  }}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 font-mono p-2.5 rounded-lg mb-4 focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
                <div className="flex justify-end gap-2 text-xs font-sans">
                  <button
                    onClick={() => setShowAddFileDialog(false)}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddFile}
                    disabled={!newFileName.trim()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white font-semibold rounded-lg transition cursor-pointer"
                  >
                    Add File
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Virtual Terminal */}
          <Terminal
            lines={terminalLines}
            onCommand={executeCommand}
            onClear={() => setTerminalLines([])}
            currentWcChangeId={workingCopy ? workingCopy.changeId : "zzzzzzzz"}
          />
        </div>


      </main>

      {/* Humble clean page footer */}
      <footer className="px-6 py-5 border-t border-slate-200 text-center text-xs text-slate-400 font-mono mt-auto flex flex-col md:flex-row items-center justify-between select-none bg-white">
        <div>
          <span>Learn Jujutsu (jj) Applet • Crafted for modern human speed</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] mt-2 md:mt-0 bg-slate-50 px-3 py-1 rounded border border-slate-100 text-slate-500">
          <span>Active Command:</span>
          <code className="text-indigo-600 font-normal">jj log</code>
          <span className="text-slate-300">|</span>
          <code className="text-indigo-600 font-normal">jj undo</code>
        </div>
      </footer>
    </div>
  );
}
