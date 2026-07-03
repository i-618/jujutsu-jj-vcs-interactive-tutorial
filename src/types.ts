export interface VirtualCommit {
  id: string;          // Commit ID (hex hash, e.g., "7f3b890a")
  changeId: string;    // Change ID (stable, e.g., "kpqzunst")
  parents: string[];   // Parent Commit IDs
  description: string; // Commit message/description
  files: { [path: string]: string }; // Virtual file system state
  isWorkingCopy: boolean; // True if this is the active working copy commit (@)
  isConflicted: boolean;  // True if this commit has merge conflicts
  conflictDetails: string | null;
  timestamp: string;
}

export interface Bookmark {
  name: string;
  commitId: string;
}

export interface RepoState {
  commits: { [id: string]: VirtualCommit };
  bookmarks: { [name: string]: string }; // Bookmark name -> Commit ID
  workingCopyId: string; // The ID of the current @ commit
}

export interface OperationLog {
  id: string;
  command: string;
  timestamp: string;
  repoState: RepoState; // Saved snapshot for undo
}

export interface TerminalLine {
  text: string;
  type: "input" | "output" | "error" | "success" | "system";
}

export interface Level {
  id: string;
  title: string;
  subtitle: string;
  description: string; // HTML or Markdown teaching text
  goals: string[];     // Bullet points of what to achieve
  startState: RepoState;
  validate: (state: RepoState) => { success: boolean; message: string };
  hint?: string;
}
