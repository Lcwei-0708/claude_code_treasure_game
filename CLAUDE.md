# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A single-page React 18 + TypeScript "Treasure Hunt" game built with Vite (exported from Figma Make). Three chests are shown; one randomly holds treasure (+$100), the others hold skeletons (-$50). The game ends when the treasure is found or all chests are opened. This repo is also used as a Claude Code course exercise — see README.md for the planned feature steps (chest sound effects, win/tie/loss result display, key-cursor on hover, SQLite sign-up/sign-in with guest mode, Vercel / GitHub Pages deploy commands in `.claude/commands/`).

## Commands

```bash
npm install
npm run dev     # Vite dev server on http://localhost:3000 (auto-opens browser); also starts the API server
npm run build   # Production build to ./build (not ./dist)
npm run server  # SQLite auth/score API alone on http://localhost:3001 (Vite proxies /api to it)
```

There is no lint, typecheck, or test setup (no ESLint, no tsconfig, no test runner). Vite/SWC strips types without checking them, so type errors will not fail the build.

## Architecture

- **All game logic and UI live in `src/App.tsx`** as one component: `boxes` / `score` / `gameEnded` state, `initializeGame` (runs on mount and on "Play Again"), and `openBox` (updates score and checks end condition inside the `setBoxes` updater). Animations use `motion/react` (Framer Motion's successor package).
- **Auth & scores**: `server/index.mjs` is a dependency-free Node HTTP server using built-in `node:sqlite` (Node 22.5+), storing `users` (scrypt password hashes), `sessions` (bearer tokens, 7-day expiry) and `scores` in `data/game.db` (gitignored; override with `DB_PATH`). `src/api.ts` is the client (token in localStorage); The game opens in guest mode; the corner "Sign in" button shows `src/components/AuthScreen.tsx` (sign-in/sign-up). Guest mode never calls the score API. This feature exists only on the `sqlite-login` branch; `main` is the static, login-free version deployed to GitHub Pages.
- **Static assets are imported as ES modules** (`src/assets/*.png`, `src/audios/*.mp3`) and Vite resolves them to URLs. `chest_open.mp3` and `chest_open_with_evil_laugh.mp3` are already imported in `App.tsx` but not yet played. `src/assets/key.png` is intended for the hover cursor. `src/results/` holds reference screenshots, not app code.
- **`src/components/ui/`** is a vendored shadcn/ui (Radix-based) component library; only `Button` is currently used. Its files import packages with version suffixes (e.g. `"@radix-ui/react-slot@1.1.2"`); these resolve only because of the matching aliases in `vite.config.ts`. If you add a new dependency imported that way, add an alias too — or import it without the version suffix. `@/` aliases to `src/`.

## Styling gotcha: Tailwind is precompiled

Tailwind is **not** installed as a build dependency. `src/index.css` (imported by `main.tsx`) is a pre-generated Tailwind v4 output containing only the utility classes that existed at export time. **A Tailwind class not already present in `src/index.css` will have no effect.** Before using a new utility, grep `src/index.css` for it; if missing, add the CSS rule manually to `index.css`, use inline `style`, or set up Tailwind (`@tailwindcss/vite`) properly. (For example, only `cursor-pointer` and `cursor-default` exist, so a custom image cursor needs inline style or custom CSS.)

`src/styles/globals.css` holds the Tailwind theme source (CSS variables, `@theme`), but it is **not imported anywhere** — editing it changes nothing unless Tailwind is wired up. `src/guidelines/Guidelines.md` is an empty Figma Make template.

## Attribution

Third-party sound/icon sources are listed in `Attributions.md`; add an entry when introducing new external assets.
