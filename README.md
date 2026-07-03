# Jujutsu Academy

Interactive, browser-based tutorial for learning [Jujutsu](https://jj-vcs.github.io/jj/latest/) (`jj`), a Git-compatible version control system.

Live app: https://i-618.github.io/jujutsu-jj-vcs-interactive-tutorial/

## What this is

This is a static React/Vite app that teaches core `jj` concepts through small guided levels. It does not run real `jj` commands or modify a real repository. Instead, it uses an in-memory repository simulator with:

- a visual commit graph
- a virtual terminal for supported `jj` commands
- a virtual working-copy file editor
- per-level objectives and validation
- undo support for simulated repository transactions

The app is designed for GitHub Pages hosting. Everything needed for the main tutorial experience runs in the browser after the Vite build.

## Lessons covered

The tutorial currently includes 10 levels:

1. Working-copy commit and auto-commit behavior
2. Creating new commits with `jj new`
3. Bookmarks as lightweight branch pointers
4. Change IDs vs commit IDs
5. Rebasing parallel work
6. First-class conflicts
7. Repository-level undo
8. Duplicating work
9. Editing historical commits directly
10. Abandoning commits and rebasing descendants

## Simulated commands

Type `help` in the app terminal to see the supported command list.

Supported commands include:

```sh
jj status
jj log
jj describe -m "message"
jj new [rev]
jj squash
jj rebase -d <dest>
jj rebase -s <source> -d <dest>
jj duplicate [rev]
jj abandon [rev]
jj edit <rev>
jj diff
jj bookmark create <name> [rev]
jj bookmark delete <name>
jj undo
clear
```

Revision arguments can be `@`, commit ID prefixes, change IDs, change ID prefixes, or bookmark names when the simulator can resolve them unambiguously.

## Tech stack

- React 19
- TypeScript
- Vite
- Tailwind CSS via `@tailwindcss/vite`
- Lucide React icons
- Motion for graph animations

There is also an Express server with an optional `/api/tutor` Gemini endpoint in `server.ts`. The current static tutorial UI does not call this endpoint, so the GitHub Pages app can run without a backend.

## Local development

Install dependencies:

```sh
npm install
```

Run the local dev server:

```sh
npm run dev
```

Open http://localhost:3000.

Type-check the app:

```sh
npm run lint
```

Build the static app:

```sh
npm run build
```

Preview the Vite build:

```sh
npm run preview
```

Run the bundled production server:

```sh
npm run start
```

## Optional Gemini tutor server

`server.ts` includes a `/api/tutor` endpoint backed by `@google/genai`. To use it locally, create a `.env` file based on `.env.example`:

```sh
GEMINI_API_KEY="your-key"
APP_URL="http://localhost:3000"
```

This is optional for the current static app experience.

## GitHub Pages deployment

For repository Pages hosting at:

```text
https://i-618.github.io/jujutsu-jj-vcs-interactive-tutorial/
```

Vite should build assets with the repository base path:

```ts
// vite.config.ts
export default defineConfig({
  base: "/jujutsu-jj-vcs-interactive-tutorial/",
  // ...
});
```

Without this, built files may reference `/assets/...`, which usually points at the domain root instead of the repository subpath.

After building, publish the generated `dist/` directory with your preferred GitHub Pages workflow.

## Project layout

```text
src/App.tsx                  Main tutorial UI and command parser
src/levels.ts                Level definitions, lesson text, goals, validation
src/simulator.ts             In-memory jj repository simulator
src/types.ts                 Shared simulator and level types
src/components/GraphView.tsx Commit graph visualization
src/components/Terminal.tsx  Virtual terminal
server.ts                    Optional Express/Gemini server
```

## License

See [LICENSE](./LICENSE).
