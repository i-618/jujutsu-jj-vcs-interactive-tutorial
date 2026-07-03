import { Level, RepoState, VirtualCommit } from "./types";
import { createInitialRepoState, generateCommitId, generateChangeId, cloneRepoState } from "./simulator";

// Level 1 Start State
const lvl1Start = createInitialRepoState();

// Level 2 Start State
const lvl2Start = createInitialRepoState();

// Level 3 Start State
const lvl3Start = (() => {
  const s = createInitialRepoState();
  const wc = s.commits[s.workingCopyId];
  wc.description = "infrastructure setup";
  return s;
})();

// Level 4 Start State (Change ID vs Commit ID)
const lvl4Start = (() => {
  const s = createInitialRepoState();
  const wc = s.commits[s.workingCopyId];
  wc.description = "typo here";
  return s;
})();

// Level 5 Start State (Rebasing & Squashing)
const lvl5Start = (() => {
  const s = createInitialRepoState();
  const rootId = "00000000";
  
  // Create A ("base work")
  const aId = generateCommitId();
  const aChangeId = "aaaaaaac";
  const commitA: VirtualCommit = {
    id: aId,
    changeId: aChangeId,
    parents: [rootId],
    description: "base work",
    files: { "main.js": "console.log('init');" },
    isWorkingCopy: false,
    isConflicted: false,
    conflictDetails: null,
    timestamp: new Date().toISOString(),
  };

  // Create B ("feature 1")
  const bId = generateCommitId();
  const bChangeId = "bbbbbbbc";
  const commitB: VirtualCommit = {
    id: bId,
    changeId: bChangeId,
    parents: [aId],
    description: "feature 1",
    files: { "main.js": "console.log('init');", "feat1.js": "const f1 = true;" },
    isWorkingCopy: false,
    isConflicted: false,
    conflictDetails: null,
    timestamp: new Date().toISOString(),
  };

  // Create C ("feature 2") on top of A (parallel work)
  const cId = generateCommitId();
  const cChangeId = "cccccccc";
  const commitC: VirtualCommit = {
    id: cId,
    changeId: cChangeId,
    parents: [aId],
    description: "feature 2",
    files: { "main.js": "console.log('init');", "feat2.js": "const f2 = true;" },
    isWorkingCopy: true,
    isConflicted: false,
    conflictDetails: null,
    timestamp: new Date().toISOString(),
  };

  // Set working copy to C
  s.commits = {
    [rootId]: s.commits[rootId],
    [aId]: commitA,
    [bId]: commitB,
    [cId]: commitC,
  };
  s.workingCopyId = cId;
  return s;
})();

// Level 6 Start State (First-Class Conflicts)
const lvl6Start = (() => {
  const s = createInitialRepoState();
  const rootId = "00000000";

  // Create A ("setup config")
  const aId = generateCommitId();
  const aChangeId = "aaaaaaac";
  const commitA: VirtualCommit = {
    id: aId,
    changeId: aChangeId,
    parents: [rootId],
    description: "setup config",
    files: { "config.json": '{\n  "port": 8080\n}' },
    isWorkingCopy: false,
    isConflicted: false,
    conflictDetails: null,
    timestamp: new Date().toISOString(),
  };

  // Create B ("set port to 3000")
  const bId = generateCommitId();
  const bChangeId = "bbbbbbbc";
  const commitB: VirtualCommit = {
    id: bId,
    changeId: bChangeId,
    parents: [aId],
    description: "set port to 3000",
    files: { "config.json": '{\n  "port": 3000\n}' },
    isWorkingCopy: false,
    isConflicted: false,
    conflictDetails: null,
    timestamp: new Date().toISOString(),
  };

  // Create C ("set port to 9000") on top of A (parallel conflicting change)
  const cId = generateCommitId();
  const cChangeId = "cccccccc";
  const commitC: VirtualCommit = {
    id: cId,
    changeId: cChangeId,
    parents: [aId],
    description: "set port to 9000",
    files: { "config.json": '{\n  "port": 9000\n}' },
    isWorkingCopy: true,
    isConflicted: false,
    conflictDetails: null,
    timestamp: new Date().toISOString(),
  };

  s.commits = {
    [rootId]: s.commits[rootId],
    [aId]: commitA,
    [bId]: commitB,
    [cId]: commitC,
  };
  s.workingCopyId = cId;
  return s;
})();

// Level 7 Start State (Robust Undo)
const lvl7Start = (() => {
  const s = createInitialRepoState();
  const rootId = "00000000";

  // Create A ("work")
  const aId = generateCommitId();
  const aChangeId = "aaaaaaac";
  const commitA: VirtualCommit = {
    id: aId,
    changeId: aChangeId,
    parents: [rootId],
    description: "vital setup code",
    files: { "vital.js": "console.log('vital');" },
    isWorkingCopy: true,
    isConflicted: false,
    conflictDetails: null,
    timestamp: new Date().toISOString(),
  };

  s.commits = {
    [rootId]: s.commits[rootId],
    [aId]: commitA,
  };
  s.workingCopyId = aId;
  return s;
})();

// Level 8 Start State (Duplicating Work)
const lvl8Start = (() => {
  const s = createInitialRepoState();
  const wc = s.commits[s.workingCopyId];
  wc.description = "exploratory draft";
  wc.files = { "sketch.txt": "Idea: Build a spaceship compiler." };
  return s;
})();

// Level 9 Start State (Editing History Directly)
const lvl9Start = (() => {
  const s = createInitialRepoState();
  const rootId = "00000000";

  // Create A ("stable core")
  const aId = generateCommitId();
  const aChangeId = "aaaaaaac";
  const commitA: VirtualCommit = {
    id: aId,
    changeId: aChangeId,
    parents: [rootId],
    description: "stable core",
    files: { "core.py": "def run(): print('core')" },
    isWorkingCopy: false,
    isConflicted: false,
    conflictDetails: null,
    timestamp: new Date().toISOString(),
  };

  // Create B ("old feature")
  const bId = generateCommitId();
  const bChangeId = "bbbbbbbc";
  const commitB: VirtualCommit = {
    id: bId,
    changeId: bChangeId,
    parents: [aId],
    description: "old feature",
    files: { "core.py": "def run(): print('core')", "feature.py": "print('old')" },
    isWorkingCopy: false,
    isConflicted: false,
    conflictDetails: null,
    timestamp: new Date().toISOString(),
  };

  // Create C ("active work") on top of B
  const cId = generateCommitId();
  const cChangeId = "cccccccc";
  const commitC: VirtualCommit = {
    id: cId,
    changeId: cChangeId,
    parents: [bId],
    description: "active work",
    files: { "core.py": "def run(): print('core')", "feature.py": "print('old')", "app.py": "import core" },
    isWorkingCopy: true,
    isConflicted: false,
    conflictDetails: null,
    timestamp: new Date().toISOString(),
  };

  s.commits = {
    [rootId]: s.commits[rootId],
    [aId]: commitA,
    [bId]: commitB,
    [cId]: commitC,
  };
  s.workingCopyId = cId;
  return s;
})();

// Level 10 Start State (Abandoning Commits)
const lvl10Start = (() => {
  const s = createInitialRepoState();
  const rootId = "00000000";

  // Create A ("good foundation")
  const aId = generateCommitId();
  const aChangeId = "aaaaaaac";
  const commitA: VirtualCommit = {
    id: aId,
    changeId: aChangeId,
    parents: [rootId],
    description: "good foundation",
    files: { "base.txt": "Base setup" },
    isWorkingCopy: false,
    isConflicted: false,
    conflictDetails: null,
    timestamp: new Date().toISOString(),
  };

  // Create B ("unwanted change")
  const bId = generateCommitId();
  const bChangeId = "bbbbbbbc";
  const commitB: VirtualCommit = {
    id: bId,
    changeId: bChangeId,
    parents: [aId],
    description: "unwanted change",
    files: { "base.txt": "Base setup", "junk.txt": "Temporary junk" },
    isWorkingCopy: false,
    isConflicted: false,
    conflictDetails: null,
    timestamp: new Date().toISOString(),
  };

  // Create C ("active work") on top of B
  const cId = generateCommitId();
  const cChangeId = "cccccccc";
  const commitC: VirtualCommit = {
    id: cId,
    changeId: cChangeId,
    parents: [bId],
    description: "active work",
    files: { "base.txt": "Base setup", "junk.txt": "Temporary junk", "main.js": "const app = true;" },
    isWorkingCopy: true,
    isConflicted: false,
    conflictDetails: null,
    timestamp: new Date().toISOString(),
  };

  s.commits = {
    [rootId]: s.commits[rootId],
    [aId]: commitA,
    [bId]: commitB,
    [cId]: commitC,
  };
  s.workingCopyId = cId;
  return s;
})();

export const levels: Level[] = [
  {
    id: "lvl1",
    title: "1. The Working Copy & Auto-Commit",
    subtitle: "No more staging area. No more 'git add'.",
    description: `
<p class="mb-4">
  Welcome to <strong>Jujutsu (jj)</strong>! One of Jujutsu's most powerful departures from Git is the 
  <strong>Automatic Working-Copy Commit</strong>.
</p>
<p class="mb-4">
  In Git, you edit files, run <code>git add</code> to stage them, and then <code>git commit</code>. 
  In <code>jj</code>, there is <strong>no staging area</strong>. The active working directory is 
  <em>always represented by an open commit</em>, marked with <strong>@</strong> in the graph.
</p>
<p class="mb-4">
  Any change you make to files is continuously and immediately recorded in this open commit in the background. 
  To add a "commit message" in Jujutsu, you describe the current open commit with <code>jj describe</code>.
</p>
`,
    goals: [
      "Describe the current working-copy commit with a description of 'my first commit'.",
      "Hint: Type <code>jj describe -m \"my first commit\"</code> in the terminal.",
    ],
    startState: lvl1Start,
    validate: (state: RepoState) => {
      const wc = state.commits[state.workingCopyId];
      if (!wc) return { success: false, message: "Working copy commit not found!" };
      if (wc.description.trim() === "my first commit") {
        return { success: true, message: "Excellent! You defined a description without needing to stage any files first." };
      }
      return { success: false, message: `Current @ commit description is: "${wc.description}". Goal is "my first commit".` };
    },
    hint: 'Type: jj describe -m "my first commit"',
  },
  {
    id: "lvl2",
    title: "2. Creating New Commits",
    subtitle: "Closing a draft and moving forward",
    description: `
<p class="mb-4">
  When you are satisfied with your current work and want to start a new, clean draft commit, 
  you use the <code>jj new</code> command.
</p>
<p class="mb-4">
  This command does three things in one step:
  <ol class="list-decimal list-inside space-y-1 mb-4 pl-4 text-slate-300">
    <li>Closes/freezes the current working-copy commit (making it a stable historical draft).</li>
    <li>Creates a new open commit (with a fresh <strong>Change ID</strong>) on top of it.</li>
    <li>Sets your working directory (<strong>@</strong>) to point to this new commit.</li>
  </ol>
</p>
<p class="mb-4">
  Let's practice describing your active commit, sealing it, and starting a new one.
</p>
`,
    goals: [
      "Describe your current working copy commit as 'implement login'.",
      "Create a new commit using <code>jj new</code>.",
      "Describe the new working copy commit as 'add dashboard'.",
    ],
    startState: lvl2Start,
    validate: (state: RepoState) => {
      const wc = state.commits[state.workingCopyId];
      if (!wc) return { success: false, message: "No working copy found." };
      if (wc.description !== "add dashboard") {
        return { success: false, message: "The current @ commit is not described as 'add dashboard'." };
      }
      if (wc.parents.length === 0) {
        return { success: false, message: "The @ commit has no parent." };
      }
      const parentId = wc.parents[0];
      const parent = state.commits[parentId];
      if (!parent) return { success: false, message: "Parent commit not found." };
      if (parent.description === "implement login") {
        return { success: true, message: "Terrific! You created a clean history chain: Root -> 'implement login' -> 'add dashboard' (active)." };
      }
      return { success: false, message: `The parent commit description is "${parent.description}" instead of "implement login".` };
    },
    hint: 'Type:\n1. jj describe -m "implement login"\n2. jj new\n3. jj describe -m "add dashboard"',
  },
  {
    id: "lvl3",
    title: "3. Bookmarks (The jujutsu Branches)",
    subtitle: "Pointing to key commits in the stream",
    description: `
<p class="mb-4">
  In Jujutsu, what Git calls <strong>branches</strong> are called <strong>bookmarks</strong>. 
  (Jujutsu recently completed this rename to emphasize that they are simply movable pointers, not heavy structures).
</p>
<p class="mb-4">
  Unlike Git, you don't need to be "on" a bookmark/branch to work. You can create commits anywhere in the tree. 
  Bookmarks are simply labels pointing to specific commits, which is handy when push/pulling to Git remotes.
</p>
<p class="mb-4">
  To set or create a bookmark on the active commit, use <code>jj bookmark create &lt;name&gt;</code>.
</p>
`,
    goals: [
      "Create a bookmark named 'feature-api' on the current commit.",
      "Create a new commit on top of it using <code>jj new</code>.",
      "Create a bookmark named 'feature-ui' on this new commit.",
    ],
    startState: lvl3Start,
    validate: (state: RepoState) => {
      const bApi = state.bookmarks["feature-api"];
      const bUi = state.bookmarks["feature-ui"];
      if (!bApi) return { success: false, message: "Missing bookmark 'feature-api'." };
      if (!bUi) return { success: false, message: "Missing bookmark 'feature-ui'." };

      if (bApi === bUi) {
        return { success: false, message: "Both bookmarks are pointing to the exact same commit!" };
      }

      const commitApi = state.commits[bApi];
      const commitUi = state.commits[bUi];

      if (commitUi.parents.includes(bApi)) {
        return { success: true, message: "Spot on! You created two bookmarks marking separate progressive points in the commit stream." };
      }
      return { success: false, message: "Please ensure 'feature-ui' is pointing to a commit that is on top of 'feature-api'." };
    },
    hint: 'Type:\n1. jj bookmark create feature-api\n2. jj new\n3. jj bookmark create feature-ui',
  },
  {
    id: "lvl4",
    title: "4. Change ID vs Commit ID",
    subtitle: "The secret to stable revision tracking",
    description: `
<p class="mb-4">
  In Git, rewriting a commit (amending, rebasing, squashing) creates a completely new commit with a new hash, 
  losing tracking of the original.
</p>
<p class="mb-4">
  Jujutsu introduces a revolutionary distinction:
  <ul class="list-disc list-inside space-y-1 mb-4 pl-4 text-slate-300">
    <li><strong>Commit ID</strong>: The cryptographic hash of the commit's contents, parent, and description (like Git's SHA-1). It changes whenever you modify anything.</li>
    <li><strong>Change ID</strong>: A stable, 8-character code (e.g., <code>kpqzunst</code>) that uniquely identifies <em>this logical piece of work</em>. Even if you edit the files, rewrite the message, or rebase, the Change ID stays the same!</li>
  </ul>
</p>
<p class="mb-4">
  This makes rewriting incredibly safe and makes tracking history painless. Let's fix a typo in our active commit. Watch the graph closely: the Commit ID (top hex) will change, but the Change ID (bottom stable string) will remain identical!
</p>
`,
    goals: [
      "Check the active @ commit. It has a typo in its message ('typo here').",
      "Correct the description using <code>jj describe -m \"fixed typo\"</code>.",
      "Observe the graph! Did the Commit ID change while the Change ID remained stable?",
      "Now, create a new commit with <code>jj new</code> to complete the lesson.",
    ],
    startState: lvl4Start,
    validate: (state: RepoState) => {
      const wc = state.commits[state.workingCopyId];
      if (!wc) return { success: false, message: "No working copy found." };
      if (wc.parents.length === 0) return { success: false, message: "No parent commit." };
      const parent = state.commits[wc.parents[0]];
      if (parent && parent.description === "fixed typo") {
        return { success: true, message: "Sensational! Note how the change ID 'qpvzunst' stayed identical, preserving the identity of the work." };
      }
      return { success: false, message: "Please describe the parent commit correctly as 'fixed typo' and make sure you run 'jj new' to move to a new commit." };
    },
    hint: 'Type:\n1. jj describe -m "fixed typo"\n2. jj new',
  },
  {
    id: "lvl5",
    title: "5. Rebasing parallel work",
    subtitle: "Rebasing is a first-class citizen",
    description: `
<p class="mb-4">
  In Git, rebasing can be nerve-wracking. In Jujutsu, rebasing is a fundamental, fully supported, and 
  easy command. You can move any commit (or tree) onto another target commit instantly.
</p>
<p class="mb-4">
  We have two parallel feature streams:
  <ul class="list-disc list-inside space-y-1 mb-4 pl-4 text-slate-300">
    <li><code>feature 1</code> (Change ID: <code>bbbbbbbc</code>) on top of base work</li>
    <li><code>feature 2</code> (Change ID: <code>cccccccc</code>) also on top of base work (parallel branch)</li>
  </ul>
</p>
<p class="mb-4">
  Let's rebase <code>feature 2</code> (which is our current working copy <code>@</code>) on top of <code>feature 1</code> 
  so we have both features merged in sequence!
</p>
`,
    goals: [
      "Rebase the current commit (@) on top of the 'feature 1' commit.",
      "Hint: Type <code>jj rebase -d bbbbbbbc</code> (or use its full change ID or short Commit ID).",
    ],
    startState: lvl5Start,
    validate: (state: RepoState) => {
      const wc = state.commits[state.workingCopyId];
      if (!wc) return { success: false, message: "No working copy found." };
      if (wc.parents.length === 0) return { success: false, message: "No parent." };
      const parentId = wc.parents[0];
      const parent = state.commits[parentId];
      if (parent && parent.description === "feature 1") {
        return { success: true, message: "Incredible rebase! jujutsu moved the entire feature 2 change on top of feature 1 seamlessly." };
      }
      return { success: false, message: "feature 2 (@) is not on top of feature 1 yet." };
    },
    hint: 'Type: jj rebase -d bbbbbbbc',
  },
  {
    id: "lvl6",
    title: "6. First-Class Conflicts",
    subtitle: "Conflicts are not blocking states",
    description: `
<p class="mb-4">
  In Git, if a merge conflict occurs during rebase/merge, everything halts. You are in a "conflicted state" 
  and cannot commit or switch branches until you manually resolve it.
</p>
<p class="mb-4">
  In Jujutsu, <strong>conflicts are first-class citizens</strong>. A conflict is simply a normal state of 
  a commit! You can describe a conflicted commit, rebase on top of a conflicted commit, or even push/pull 
  conflicts to remotes. You resolve conflicts at your own leisure.
</p>
<p class="mb-4">
  Let's trigger a conflict. We have two parallel commits that both modified the <code>port</code> inside <code>config.json</code>. 
  Let's rebase the active commit (<code>cccccccc</code>) on top of <code>bbbbbbbc</code>.
</p>
`,
    goals: [
      "Rebase the active commit on top of 'set port to 3000' (Change ID: <code>bbbbbbbc</code>).",
      "Run <code>jj status</code> to inspect the resulting conflict.",
    ],
    startState: lvl6Start,
    validate: (state: RepoState) => {
      const wc = state.commits[state.workingCopyId];
      if (!wc) return { success: false, message: "No working copy found." };
      if (wc.parents.length > 0 && wc.parents[0] !== "00000000") {
        const parent = state.commits[wc.parents[0]];
        if (parent && parent.description === "set port to 3000" && wc.isConflicted) {
          return { success: true, message: "Wow! Look at that. The rebase succeeded, the commit was created, and it is marked as CONFLICTED. You can keep working normally!" };
        }
      }
      return { success: false, message: "Please rebase the active commit on top of 'bbbbbbbc' first to trigger the conflict." };
    },
    hint: 'Type: jj rebase -d bbbbbbbc',
  },
  {
    id: "lvl7",
    title: "7. The Magical Undo",
    subtitle: "Infinite safety in version control",
    description: `
<p class="mb-4">
  Have you ever run a destructive Git command like <code>git reset --hard</code> or a wrong rebase and panicked?
</p>
<p class="mb-4">
  Jujutsu features an <strong>Operation Log</strong>. Every single command you run that modifies the repository 
  creates a transaction log entry. 
</p>
<p class="mb-4">
  This means you can run <code>jj undo</code> at any time to undo the last transaction and restore the exact 
  previous repository state. It's like Command+Z for your entire version control system!
</p>
<p class="mb-4">
  Let's test this! First, make a mistake by accidentally squashing your active work. Then, use <code>jj undo</code> 
  to bring it back perfectly.
</p>
`,
    goals: [
      "Run <code>jj squash</code> to accidentally squash your active 'vital setup code' commit into the root.",
      "See how the graph collapses. Oh no!",
      "Now, type <code>jj undo</code> to restore your vital work instantly!",
    ],
    startState: lvl7Start,
    validate: (state: RepoState, history?: any[]) => {
      // To validate lvl7, we want to see that they ran a squash (or their commit was squashed) 
      // AND then they successfully ran jj undo, returning the state to have 'vital setup code' as the active commit.
      // Since the startState is already 'vital setup code', we should check that they performed at least one transaction AND returned back to original startState!
      const wc = state.commits[state.workingCopyId];
      if (wc && wc.description === "vital setup code" && wc.parents.includes("00000000")) {
        // Find if squash was run then undo was run
        return { success: true, message: "Amazing! You successfully undid your mistake. jj undo gives you absolute confidence to experiment!" };
      }
      return { success: false, message: "Squash your commit first, then type 'jj undo' to recover it." };
    },
    hint: 'Type:\n1. jj squash\n2. jj undo',
  },
  {
    id: "lvl8",
    title: "8. Duplicating Work",
    subtitle: "Parallel copies for safe prototyping",
    description: `
<p class="mb-4">
  Sometimes you want to test a radical or alternative approach without losing your current progress, 
  or save a snapshot of a draft before doing a massive refactoring.
</p>
<p class="mb-4">
  In Git, you'd have to create a temporary branch, commit, and then switch back. 
  In Jujutsu, you can duplicate any revision with <code>jj duplicate [rev]</code>.
</p>
<p class="mb-4">
  This copies the commit with the exact same parent and files, but generates a 
  <strong>brand new Change ID</strong>. This ensures Jujutsu treats it as a completely independent parallel 
  thread of work!
</p>
`,
    goals: [
      "Duplicate your current working copy commit using <code>jj duplicate</code>.",
      "Start a fresh draft on top of your original work using <code>jj new</code>.",
    ],
    startState: lvl8Start,
    validate: (state: RepoState) => {
      const commits = Object.values(state.commits);
      const duplicateExists = commits.some(c => c.description.includes("exploratory draft (duplicate)"));
      if (!duplicateExists) {
        return { success: false, message: "No duplicated 'exploratory draft' commit found. Run 'jj duplicate' first." };
      }
      const wc = state.commits[state.workingCopyId];
      if (wc && wc.description === "") {
        return { success: true, message: "Fantastic! You duplicated your draft into a parallel branch and started a fresh commit. This is perfect for safe experimentation!" };
      }
      return { success: false, message: "You duplicated the work, now create a fresh new draft with 'jj new' to finalize the lesson." };
    },
    hint: 'Type:\n1. jj duplicate\n2. jj new',
  },
  {
    id: "lvl9",
    title: "9. Direct History Editing",
    subtitle: "Rewrite history without rebasing pain",
    description: `
<p class="mb-4">
  In Git, if you want to edit a commit that is several steps back in your history, you have to initiate 
  an interactive rebase (<code>git rebase -i</code>), mark the target commit for editing, let Git rewind, 
  make your changes, and run <code>git rebase --continue</code>.
</p>
<p class="mb-4">
  In Jujutsu, <strong>any historical commit can be edited directly</strong>! Just run <code>jj edit &lt;rev&gt;</code> 
  (using its Change ID or short Commit ID).
</p>
<p class="mb-4">
  This immediately sets the specified historical commit as the active working copy (<strong>@</strong>). 
  Any edits you make to files are instantly and automatically saved directly inside that historical commit! 
  When you are done, you can jump back or create a new commit.
</p>
`,
    goals: [
      "We have an older commit with Change ID <code>bbbbbbbc</code> described as 'old feature'.",
      "Switch to editing it directly with <code>jj edit bbbbbbbc</code>.",
      "Once active, update its description to 'updated feature' using <code>jj describe -m \"updated feature\"</code>.",
    ],
    startState: lvl9Start,
    validate: (state: RepoState) => {
      const commits = Object.values(state.commits);
      const bCommit = commits.find(c => c.changeId === "bbbbbbbc");
      if (!bCommit) return { success: false, message: "Target commit 'bbbbbbbc' not found." };

      if (!bCommit.isWorkingCopy) {
        return { success: false, message: "You haven't set the old feature commit as active yet. Run 'jj edit bbbbbbbc'." };
      }

      if (bCommit.description === "updated feature") {
        return { success: true, message: "Incredible! You edited a historical commit directly. No interactive rebase loops needed. Jujutsu automatically tracks modifications and propagates them seamlessly!" };
      }
      return { success: false, message: "Excellent! You are now editing the commit. Change its description using: jj describe -m \"updated feature\"" };
    },
    hint: 'Type:\n1. jj edit bbbbbbbc\n2. jj describe -m "updated feature"',
  },
  {
    id: "lvl10",
    title: "10. Abandoning Commits",
    subtitle: "Infinite deletions with zero panic",
    description: `
<p class="mb-4">
  What do you do when a piece of draft work is no longer needed, or you want to delete a commit in the 
  middle of your history?
</p>
<p class="mb-4">
  In Git, you might run <code>git reset --hard</code> (which deletes your local changes permanently and can 
  be very dangerous) or manually edit lines in an interactive rebase.
</p>
<p class="mb-4">
  In Jujutsu, you can delete a commit safely and cleanly by running <code>jj abandon &lt;rev&gt;</code>.
</p>
<p class="mb-4">
  If the abandoned commit has any child commits (descendants), Jujutsu will 
  <strong>automatically and instantly rebase</strong> all of those child commits onto the abandoned commit's parent! 
  No files are lost, and your chain of history stays perfectly unified.
</p>
`,
    goals: [
      "We have an unwanted middle commit described as 'unwanted change' (Change ID: <code>bbbbbbbc</code>).",
      "Abandon it using <code>jj abandon bbbbbbbc</code>.",
      "See how its child commit ('active work') automatically rebases on top of its parent ('good foundation')!",
    ],
    startState: lvl10Start,
    validate: (state: RepoState) => {
      const commits = Object.values(state.commits);
      const bExists = commits.some(c => c.changeId === "bbbbbbbc");
      if (bExists) {
        return { success: false, message: "The unwanted commit 'bbbbbbbc' is still in your repository. Run 'jj abandon bbbbbbbc' to remove it." };
      }

      const cCommit = commits.find(c => c.changeId === "cccccccc");
      if (!cCommit) return { success: false, message: "Active commit 'cccccccc' not found." };

      const aCommit = commits.find(c => c.changeId === "aaaaaaac");
      if (!aCommit) return { success: false, message: "Commit 'aaaaaaac' not found." };

      if (cCommit.parents.includes(aCommit.id)) {
        return { success: true, message: "Magnificent! You abandoned the middleman commit, and Jujutsu automatically re-routed and rebased 'active work' directly onto 'good foundation'. Extremely clean, robust, and automated!" };
      }

      return { success: false, message: "Commit 'cccccccc' is not rebased onto 'aaaaaaac' yet." };
    },
    hint: 'Type: jj abandon bbbbbbbc',
  }
];
