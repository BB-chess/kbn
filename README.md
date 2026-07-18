# KBN vs K — Bishop & Knight Mate Trainer

Any, offline-capable web app (PWA) for practising the bishop-and-knight
checkmate against a **perfect defender**. The engine plays from a complete
KBNK distance-to-mate tablebase, so it always defends optimally and you get
instant feedback when a move drifts from the fastest mate.

It's the companion trainer to the puzzle book *The Bishop & Knight Checkmate*
(mate in 1–4). The book teaches the patterns; the app is where you practise
the full technique.

## Run locally

Double-click `start.bat` (Windows), or serve the folder over HTTP any way you
like, e.g.:

```bash
npx serve -l 5173
```

Then open `http://localhost:5173/`. (It must be served over HTTP, not opened
as a `file://` path, so the browser can fetch the tablebase.)

## Publish free on GitHub Pages

The app is fully static and uses only relative paths, so it runs from a project
sub-path (`https://<user>.github.io/<repo>/`) with no changes. **No Git install
is required** — you can do the whole thing in the browser.

1. Create a (free) GitHub account — a pen-name account is fine.
2. Create a new **public** repository, e.g. `kbn`.
3. On the empty repo page choose **"uploading an existing file"**, then drag in
   the entire contents of this folder (keep the `icons/` and `tb/` sub-folders)
   and commit.
4. **Settings ▸ Pages ▸ Build and deployment**: set
   **Source = Deploy from a branch**, **Branch = `main` / root**, and save.
5. After a minute your app is live at `https://<user>.github.io/kbn/`.
   HTTPS is automatic (required for the PWA / offline install).

Prefer the command line? If you have [Git](https://git-scm.com/download/win)
installed (it isn't required):

```bash
git init
git add .
git commit -m "KBN vs K trainer"
git branch -M main
git remote add origin https://github.com/<user>/kbn.git
git push -u origin main
```

Put the resulting `https://<user>.github.io/kbn/` URL into the puzzle-book
builder's **"Refer reader to the practice app"** field so it prints on the
title and review pages.

## Credits

Chess piece images: the **Cburnett** set by Colin M. L. Burnett (Wikimedia
Commons), used under the GNU GPL. The pieces live in `pieces/` as SVG.

## Notes

- `.nojekyll` disables GitHub's Jekyll processing so every file (including the
  `tb/kbnk-dtm.bin` tablebase) is served verbatim.
- The service worker (`service-worker.js`) precaches the whole app — including
  the ~32 MB tablebase — on first visit, so it then works fully offline and can
  be "installed" to the desktop/home screen.
- Bump `CACHE` in `service-worker.js` whenever you change files, to force
  installed copies to update.
