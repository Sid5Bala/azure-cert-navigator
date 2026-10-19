# Azure Cert Navigator

One offline-first study app for three Microsoft certifications:

| Exam | Title | Skills outline |
| --- | --- | --- |
| **AZ-104** | Microsoft Azure Administrator | as of April 17, 2026 |
| **AZ-305** | Designing Microsoft Azure Infrastructure Solutions | as of April 17, 2026 |
| **AI-103** | Developing AI Apps and Agents on Azure (replaces AI-102) | as of April 16, 2026 |

It merges the earlier separate AZ-104 cheat sheet and AZ-305 Service Navigator into one React PWA, adds AI-103, and adds new practice modes.

## What's inside

For every exam:

- **Overview** – official skills-measured outline with self-rating per objective, domain weights, readiness score and a "study next" suggestion.
- **Learn** – domain deep dives (key terms, comparison tables, exam traps), service navigator ("choose when / don't confuse with / cue words"), "same word, different thing" disambiguation, and Microsoft Learn doc links.
- **Decide** – decision trees (requirement → service) with real-world combos and anti-patterns; trigger phrases with a self-test mode.
- **Practice** – multiple-choice quiz with explanations and "retry missed", scenario drills with trap elimination, and spaced-repetition flashcards (Leitner boxes).
- **Search** – one search across every term, table row, trap, tree, trigger, drill and question in all three exams (press `/`).

Progress (ratings, quiz history, drills, flashcard boxes) is stored in the browser's localStorage on each device. Light/dark/system theme. Installable and fully usable offline.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build   # validates all exam content, then builds to dist/
npm run preview
```

`npm run validate` checks every exam module against the schema (ids, table row widths, quiz answer indexes, domain references).

## Add or edit content

All content lives in `src/data/<exam>.js` as plain data — see [`src/data/README.md`](src/data/README.md) for the schema. Any new exam file dropped into `src/data/` is picked up automatically.

## Deploy

Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`. The build uses a relative base path, so `dist/` also works as-is on Netlify, Azure Static Web Apps, Cloudflare Pages or any static host.

## Install on a phone

- **iPhone/iPad (Safari):** Share → Add to Home Screen.
- **Android (Chrome):** menu ⋮ → Install app (or use the Install button on the home screen).

Not affiliated with Microsoft. Always confirm details against the official study guides on Microsoft Learn.
