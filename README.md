# creatio.design (deployed site)

This repository serves creatio.design through GitHub Pages (branch `main`, `CNAME`).
It holds the built static site only. The source, the design rules (`AGENTS.md`) and the approved copy (`content/`) live on branch `main` of [hiCreatio/creatiowebsite](https://github.com/hiCreatio/creatiowebsite). (Until 2026-11-12 the current source sat on `redesign/profile-v12`; that branch now equals `main`. The June 2026 site is kept on `archive/main-2026-06-v2`. Never deploy from either of those.)

To update: copy `index.html`, `favicon.svg`, `work/`, `assets/` and `design-system/` from `main` of that repository and push here, with the commit message `Deploy creatiowebsite <short sha>`. Keep `CNAME` and `.nojekyll`. Change the source first; a change made only here is lost on the next deploy.

Last sync: creatiowebsite `9de60d8` (hero 3D scene) equals this repository's served files.
The previous site (before 2026-10-08) remains in this repository's history.
