# LectureMind

A local, universal lecture-to-mind-map workspace. It browses university PDFs by semester, module, and lecture, then uses the installed Codex CLI to build an intuition-first learning dependency map.

## Run

```bash
python3 server.py
```

Open <http://127.0.0.1:4174>. The app has no build step, external fonts, analytics, CDN assets, or application cloud backend.

By default, LectureMind scans `~/Documents/Semesters`. To use another local library, set `LECTUREMIND_SEMESTERS` before starting the server:

```bash
LECTUREMIND_SEMESTERS="/path/to/Semesters" python3 server.py
```

## Features

- Home screen with recent mind maps
- Semester → module → lecture PDF library
- Local PDF import and constrained Codex generation
- Generic interactive viewer for generated maps
- Concept maps ordered by educational dependency rather than page order alone
- Intuition, motivation, misconception, equation, and source evidence for every concept
- Search, focus mode, zoom, progress saved in browser local storage, and responsive inspector
- Local original PDFs and rendered page evidence (not tracked by Git)
- Deterministic, editable diagrams.net export generated entirely in the browser

## Project structure

- `index.html` — application shell
- `src/` — application logic and responsive visual system
- `assets/` — local source documents and rendered pages (ignored)
- `data/maps/` — locally generated map data (ignored)
- `generated/` — locally generated exports (ignored)
- `server.py` — standard-library local server
