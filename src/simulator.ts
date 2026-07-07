import { RepoState, VirtualCommit, Bookmark } from "./types";

// Helper to generate a random hash of 8 hex characters for Commit ID
export function generateCommitId(): string {
  const chars = "0123456789abcdef";
  let hash = "";
  for (let i = 0; i < 8; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

// Helper to generate an 8 letter stable Change ID
export function generateChangeId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let changeId = "";
  for (let i = 0; i < 8; i++) {
    changeId += chars[Math.floor(Math.random() * chars.length)];
  }
  return changeId;
}

// Deep clone helper
export function cloneRepoState(state: RepoState): RepoState {
  return JSON.parse(JSON.stringify(state));
}

// Initialize a brand new Jujutsu repo state
export function createInitialRepoState(): RepoState {
  const rootCommitId = "00000000";
  const rootCommit: VirtualCommit = {
    id: rootCommitId,
    changeId: "zzzzzzzz",
    parents: [],
    description: "root()",
    files: {},
    isWorkingCopy: false,
    isConflicted: false,
    conflictDetails: null,
    timestamp: new Date().toISOString(),
  };

  const initialWcId = generateCommitId();
  const initialWcChangeId = generateChangeId();
  const initialWc: VirtualCommit = {
    id: initialWcId,
    changeId: initialWcChangeId,
    parents: [rootCommitId],
    description: "",
    files: {},
    isWorkingCopy: true,
    isConflicted: false,
    conflictDetails: null,
    timestamp: new Date().toISOString(),
  };

  return {
    commits: {
      [rootCommitId]: rootCommit,
      [initialWcId]: initialWc,
    },
    bookmarks: {},
    workingCopyId: initialWcId,
  };
}

// Check if a commit is an ancestor of another
export function isAncestor(state: RepoState, ancestorId: string, descendantId: string): boolean {
  if (ancestorId === descendantId) return true;
  const descendant = state.commits[descendantId];
  if (!descendant) return false;
  return descendant.parents.some(parentId => isAncestor(state, ancestorId, parentId));
}

// Find a commit by a short ID or Change ID or Bookmark name
export function findCommit(state: RepoState, query: string): VirtualCommit | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  // 1. Match '@' for current working copy
  if (q === "@") {
    return state.commits[state.workingCopyId] || null;
  }

  // 2. Match exact Commit ID
  if (state.commits[q]) {
    return state.commits[q];
  }

  // 3. Match partial Commit ID
  const matchesCommitId = Object.values(state.commits).filter(c => c.id.toLowerCase().startsWith(q));
  if (matchesCommitId.length === 1) {
    return matchesCommitId[0];
  }

  // 4. Match exact Change ID
  const matchesChangeId = Object.values(state.commits).filter(c => c.changeId.toLowerCase() === q);
  if (matchesChangeId.length === 1) {
    return matchesChangeId[0];
  }

  // 5. Match partial Change ID
  const matchesPartialChangeId = Object.values(state.commits).filter(c => c.changeId.toLowerCase().startsWith(q));
  if (matchesPartialChangeId.length === 1) {
    return matchesPartialChangeId[0];
  }

  // 6. Match Bookmark name
  if (state.bookmarks[query]) {
    const cid = state.bookmarks[query];
    if (state.commits[cid]) {
      return state.commits[cid];
    }
  }

  return null;
}

// Write or edit files in the current working copy (auto-commit behavior)
export function updateWorkingCopyFiles(state: RepoState, files: { [path: string]: string }): RepoState {
  const newState = cloneRepoState(state);
  const wc = newState.commits[newState.workingCopyId];
  if (wc) {
    wc.files = { ...wc.files, ...files };
    // Automatically re-evaluate conflicts if files have conflict markers
    let isConf = false;
    for (const content of Object.values(wc.files)) {
      if (content.includes("<<<<<<<") && content.includes("=======") && content.includes(">>>>>>>")) {
        isConf = true;
        break;
      }
    }
    wc.isConflicted = isConf;
    if (!isConf) wc.conflictDetails = null;
  }
  return newState;
}

// Describe a commit (set message)
export function describeCommit(state: RepoState, revQuery: string, description: string): RepoState {
  const newState = cloneRepoState(state);
  const target = findCommit(newState, revQuery);
  if (target) {
    target.description = description;
  }
  return newState;
}

// jj new: close the current working copy and start a new one
export function newCommit(state: RepoState, parentRevQuery?: string): RepoState {
  const newState = cloneRepoState(state);
  const currentWc = newState.commits[newState.workingCopyId];

  let parentId = newState.workingCopyId;
  if (parentRevQuery) {
    const parentTarget = findCommit(newState, parentRevQuery);
    if (parentTarget) {
      parentId = parentTarget.id;
    }
  }

  // Create new working-copy commit
  const newWcId = generateCommitId();
  const newWcChangeId = generateChangeId();

  // Copy files from parent commit
  const parentCommit = newState.commits[parentId];
  const files = parentCommit ? { ...parentCommit.files } : {};

  // Mark previous working copy as no longer working copy
  if (currentWc) {
    currentWc.isWorkingCopy = false;
  }

  const newWc: VirtualCommit = {
    id: newWcId,
    changeId: newWcChangeId,
    parents: [parentId],
    description: "",
    files,
    isWorkingCopy: true,
    isConflicted: false,
    conflictDetails: null,
    timestamp: new Date().toISOString(),
  };

  newState.commits[newWcId] = newWc;
  newState.workingCopyId = newWcId;

  return newState;
}

// jj squash: Merges changes of a commit into its parent
export function squashCommit(state: RepoState, revQuery: string): { newState: RepoState; message: string } {
  const newState = cloneRepoState(state);
  const target = findCommit(newState, revQuery);
  if (!target) {
    return { newState: state, message: `Error: Revision not found: ${revQuery}` };
  }

  if (target.id === "00000000") {
    return { newState: state, message: `Error: Cannot squash root commit.` };
  }

  if (target.parents.length === 0) {
    return { newState: state, message: `Error: Commit has no parent to squash into.` };
  }

  // Squash into the first parent
  const parentId = target.parents[0];
  const parent = newState.commits[parentId];

  if (parentId === "00000000") {
    return { newState: state, message: `Error: Cannot squash into the root commit.` };
  }

  // Merge files
  parent.files = { ...parent.files, ...target.files };
  if (target.description && !parent.description.includes(target.description)) {
    parent.description = parent.description ? `${parent.description}\nSquashed: ${target.description}` : target.description;
  }

  // Update children of target to point to parent
  Object.values(newState.commits).forEach(c => {
    c.parents = c.parents.map(pid => (pid === target.id ? parentId : pid));
  });

  // Update bookmarks pointing to target to parent
  Object.keys(newState.bookmarks).forEach(name => {
    if (newState.bookmarks[name] === target.id) {
      newState.bookmarks[name] = parentId;
    }
  });

  // If squashed commit was the working copy, we need a new working copy on top of parent
  if (target.isWorkingCopy) {
    delete newState.commits[target.id];
    // Create new WC
    const newWcId = generateCommitId();
    const newWcChangeId = generateChangeId();
    const newWc: VirtualCommit = {
      id: newWcId,
      changeId: newWcChangeId,
      parents: [parentId],
      description: "",
      files: { ...parent.files },
      isWorkingCopy: true,
      isConflicted: false,
      conflictDetails: null,
      timestamp: new Date().toISOString(),
    };
    newState.commits[newWcId] = newWc;
    newState.workingCopyId = newWcId;
  } else {
    delete newState.commits[target.id];
  }

  return { newState, message: `Squashed commit ${target.changeId} (${target.id}) into parent ${parent.changeId} (${parent.id}).` };
}

// jj duplicate: duplicates a commit (including parents but with a new Change ID)
export function duplicateCommit(state: RepoState, revQuery: string): { newState: RepoState; message: string } {
  const newState = cloneRepoState(state);
  const target = findCommit(newState, revQuery);
  if (!target) {
    return { newState: state, message: `Error: Revision not found: ${revQuery}` };
  }

  const dupId = generateCommitId();
  const dupChangeId = generateChangeId();

  const dup: VirtualCommit = {
    id: dupId,
    changeId: dupChangeId,
    parents: [...target.parents],
    description: target.description ? `${target.description} (duplicate)` : "duplicate",
    files: { ...target.files },
    isWorkingCopy: false,
    isConflicted: target.isConflicted,
    conflictDetails: target.conflictDetails,
    timestamp: new Date().toISOString(),
  };

  newState.commits[dupId] = dup;

  return { newState, message: `Duplicated commit ${target.changeId} (${target.id}) to ${dupChangeId} (${dupId}).` };
}

// jj rebase: Rebases a commit and its descendants onto a destination
export function rebaseCommit(state: RepoState, srcQuery: string, destQuery: string): { newState: RepoState; message: string } {
  const newState = cloneRepoState(state);
  const src = findCommit(newState, srcQuery);
  const dest = findCommit(newState, destQuery);

  if (!src) return { newState: state, message: `Error: Source revision not found: ${srcQuery}` };
  if (!dest) return { newState: state, message: `Error: Destination revision not found: ${destQuery}` };

  if (src.id === "00000000") return { newState: state, message: `Error: Cannot rebase root commit.` };
  if (isAncestor(newState, src.id, dest.id)) {
    return { newState: state, message: `Error: Cannot rebase onto descendant commit.` };
  }

  // Find all descendants of src that we need to rebase as well
  const descendantsToRebase: string[] = [];
  function collectDescendants(parentId: string) {
    Object.values(newState.commits).forEach(c => {
      if (c.parents.includes(parentId) && !descendantsToRebase.includes(c.id)) {
        descendantsToRebase.push(c.id);
        collectDescendants(c.id);
      }
    });
  }
  collectDescendants(src.id);

  // Map of old Commit ID -> new Commit ID for rebased nodes
  const rebaseMap: { [oldId: string]: string } = {};

  // Rebase the source commit itself first
  const newSrcId = generateCommitId();
  rebaseMap[src.id] = newSrcId;

  // Perform virtual merge of file states
  const parentFiles = src.parents.length > 0 ? (newState.commits[src.parents[0]]?.files || {}) : {};
  const destFiles = dest.files;
  const srcFiles = src.files;

  // Three-way merge simulation
  const mergedFiles: { [path: string]: string } = { ...destFiles };
  let hasConflicts = false;
  let conflictDetails = "";

  const allFileKeys = new Set([
    ...Object.keys(parentFiles),
    ...Object.keys(destFiles),
    ...Object.keys(srcFiles),
  ]);

  for (const file of allFileKeys) {
    const baseVal = parentFiles[file];
    const srcVal = srcFiles[file];
    const destVal = destFiles[file];

    if (srcVal !== baseVal && destVal === baseVal) {
      // Source modified, dest did not -> take source
      if (srcVal !== undefined) {
        mergedFiles[file] = srcVal;
      } else {
        delete mergedFiles[file];
      }
    } else if (srcVal === baseVal && destVal !== baseVal) {
      // Dest modified, source did not -> take dest
      if (destVal !== undefined) {
        mergedFiles[file] = destVal;
      } else {
        delete mergedFiles[file];
      }
    } else if (srcVal !== baseVal && destVal !== baseVal && srcVal !== destVal) {
      // Overlapping conflict!
      hasConflicts = true;
      conflictDetails = `Conflict in file: ${file}`;
      mergedFiles[file] = `<<<<<<< Parents Merge\n${destVal || ""}\n=======\n${srcVal || ""}\n>>>>>>> Rebased Change`;
    }
  }

  const newSrcCommit: VirtualCommit = {
    ...src,
    id: newSrcId,
    parents: [dest.id],
    files: mergedFiles,
    isConflicted: hasConflicts,
    conflictDetails: hasConflicts ? conflictDetails : null,
    timestamp: new Date().toISOString(),
  };

  newState.commits[newSrcId] = newSrcCommit;

  // Rebase descendants transitively
  // To keep parents correct, we process descendants in topological order (by tracing parent relations)
  const remaining = new Set(descendantsToRebase);
  while (remaining.size > 0) {
    let processedAny = false;
    for (const dId of remaining) {
      const desc = newState.commits[dId];
      // Check if all parents that are part of the rebased sub-tree have already been mapped
      const canProcess = desc.parents.every(pId => !remaining.has(pId));
      if (canProcess) {
        const newDId = generateCommitId();
        rebaseMap[dId] = newDId;

        // Resolve new parent IDs
        const newParents = desc.parents.map(pId => rebaseMap[pId] || pId);

        // Files merge simulation for descendant
        const descParentFiles = desc.parents.length > 0 ? (newState.commits[desc.parents[0]]?.files || {}) : {};
        const newParentFiles = newState.commits[newParents[0]]?.files || {};
        const newDescFiles = { ...newParentFiles };

        // Simple overlay
        Object.keys(desc.files).forEach(f => {
          if (desc.files[f] !== descParentFiles[f]) {
            newDescFiles[f] = desc.files[f];
          }
        });

        const newDescCommit: VirtualCommit = {
          ...desc,
          id: newDId,
          parents: newParents,
          files: newDescFiles,
          timestamp: new Date().toISOString(),
        };

        newState.commits[newDId] = newDescCommit;
        remaining.delete(dId);
        processedAny = true;
      }
    }
    if (!processedAny) {
      // Cycle or fallback break
      break;
    }
  }

  // Redirect bookmarks pointing to old rebased commits to their new versions
  Object.keys(newState.bookmarks).forEach(bName => {
    const oldCId = newState.bookmarks[bName];
    if (rebaseMap[oldCId]) {
      newState.bookmarks[bName] = rebaseMap[oldCId];
    }
  });

  // If working copy was rebased, update workingCopyId
  if (rebaseMap[newState.workingCopyId]) {
    newState.workingCopyId = rebaseMap[newState.workingCopyId];
  }

  // Remove old versions of rebased commits
  Object.keys(rebaseMap).forEach(oldId => {
    delete newState.commits[oldId];
  });

  return {
    newState,
    message: `Rebased commit ${src.changeId} and descendants on top of ${dest.changeId}.`
  };
}

// bookmark commands
export function setBookmark(state: RepoState, name: string, revQuery?: string): { newState: RepoState; message: string } {
  const newState = cloneRepoState(state);
  const targetId = revQuery ? findCommit(newState, revQuery)?.id : state.workingCopyId;

  if (!targetId) {
    return { newState: state, message: `Error: Revision not found: ${revQuery || "@"}` };
  }

  newState.bookmarks[name] = targetId;
  const commit = newState.commits[targetId];
  return {
    newState,
    message: `Created/updated bookmark '${name}' pointing to commit ${commit.changeId} (${commit.id}).`
  };
}

export function deleteBookmark(state: RepoState, name: string): { newState: RepoState; message: string } {
  const newState = cloneRepoState(state);
  if (!newState.bookmarks[name]) {
    return { newState: state, message: `Error: Bookmark '${name}' not found.` };
  }
  delete newState.bookmarks[name];
  return { newState, message: `Deleted bookmark '${name}'.` };
}

// jj abandon: Abandons a commit, rebasing its descendants onto its parents
export function abandonCommit(state: RepoState, revQuery: string): { newState: RepoState; message: string } {
  const newState = cloneRepoState(state);
  const target = findCommit(newState, revQuery);
  if (!target) {
    return { newState: state, message: `Error: Revision not found: ${revQuery}` };
  }
  if (target.id === "00000000") {
    return { newState: state, message: `Error: Cannot abandon root commit.` };
  }

  const parentId = target.parents[0] || "00000000";

  // Re-route children to target's parent
  Object.values(newState.commits).forEach(c => {
    c.parents = c.parents.map(pid => (pid === target.id ? parentId : pid));
  });

  // Re-route bookmarks to the parent
  Object.keys(newState.bookmarks).forEach(name => {
    if (newState.bookmarks[name] === target.id) {
      newState.bookmarks[name] = parentId;
    }
  });

  // If we abandoned the current working copy, create a new working copy on top of parent
  if (target.isWorkingCopy) {
    delete newState.commits[target.id];
    const newWcId = generateCommitId();
    const newWcChangeId = generateChangeId();
    const parentCommit = newState.commits[parentId];
    const files = parentCommit ? { ...parentCommit.files } : {};
    const newWc: VirtualCommit = {
      id: newWcId,
      changeId: newWcChangeId,
      parents: [parentId],
      description: "",
      files,
      isWorkingCopy: true,
      isConflicted: false,
      conflictDetails: null,
      timestamp: new Date().toISOString(),
    };
    newState.commits[newWcId] = newWc;
    newState.workingCopyId = newWcId;
  } else {
    delete newState.commits[target.id];
  }

  return {
    newState,
    message: `Abandoned commit ${target.changeId.slice(0, 4)} (${target.id.slice(0, 4)}). Descendants rebased onto parent.`
  };
}

// jj edit: Makes an existing commit the active working copy commit
export function editCommit(state: RepoState, revQuery: string): { newState: RepoState; message: string } {
  const newState = cloneRepoState(state);
  const target = findCommit(newState, revQuery);
  if (!target) {
    return { newState: state, message: `Error: Revision not found: ${revQuery}` };
  }
  if (target.id === "00000000") {
    return { newState: state, message: `Error: Cannot edit root commit.` };
  }

  // Mark current working copy as no longer working copy
  const currentWc = newState.commits[newState.workingCopyId];
  if (currentWc) {
    currentWc.isWorkingCopy = false;
  }

  // Mark target commit as working copy
  target.isWorkingCopy = true;
  newState.workingCopyId = target.id;

  return {
    newState,
    message: `Now editing commit ${target.changeId.slice(0, 4)} (${target.id.slice(0, 4)}). Files loaded to workspace.`
  };
}

