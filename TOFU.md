# Excalidraw on Tofu

Excalidraw is a virtual whiteboard for sketching diagrams that look hand-drawn: boxes, arrows, text, freehand lines, images and ready-made shape libraries on an endless canvas, saved as `.excalidraw` files or exported as PNG or SVG images. This fork is the copy Tofu's app gallery puts into a person's own Tofu account: upstream's app, built from source, with the features that depend on the upstream authors' own servers switched off. A person's drawings stay in their own browser.

## How Tofu runs it

|  |  |
| --- | --- |
| Framework preset | `vite` |
| Package manager | Yarn 1.22.22 (the repository's `packageManager`), with the repository's own `yarn.lock` |
| Install command | `yarn install --frozen-lockfile` (set in `vercel.json`) |
| Build command | `yarn build`, which runs `node scripts/tofu-build.mjs` (set in `vercel.json`) |
| Output directory | `dist/` at the repository root |
| Environment variables | none |
| Database | none: drawings are kept in the visitor's browser (localStorage, with images in IndexedDB) |
| Node | 18 or later (verified with Node 22) |

`scripts/tofu-build.mjs` builds `excalidraw-app` the way upstream's own self-hosting image does (`build:app:docker` in `excalidraw-app/package.json`: Sentry and tracking off), stamps the version like upstream's `build:version`, moves the site from `excalidraw-app/build` to `dist/`, and copies the UI font (Assistant) into `dist/fonts/Assistant/`. It builds with the addresses of the switched-off upstream services left empty, so no code in the built site can reach them.

Use the `vite` preset although the repository has a root `Dockerfile`: that file is upstream's own self-hosting image (nginx), and Tofu's detector may suggest `container` because of it.

### Hosting notes

- This is a Yarn workspace monorepo with its own build script, so Tofu's shared static lane does not build it; Tofu builds it on its Vercel lane. On the Free plan that makes it the account's one app with full hosting.
- The built site is 507 files and 46.8 MB; 121 of the files (23.9 MB) are source maps.
- The repository archive at the pin is 36.5 MB compressed, and 1,323 files and 56.8 MB unpacked, inside the importer's limits (50 MB, 20,000 files, 250 MB). Nothing was removed for size.

## What this fork changes, and why

Every changed spot in a source file carries a comment starting with `Tofu:`. JSON files cannot hold comments, so their changes are listed here.

1. **Nothing is loaded from or sent to third parties when the page opens.**
   - `excalidraw-app/index.html`: removed the Simple Analytics script the production page loaded, and the preconnect to Google Fonts (nothing is loaded from Google).
   - `excalidraw-app/index.tsx`: no longer imports `excalidraw-app/sentry.ts`, so `Sentry.init` never runs and no error report reaches the upstream authors' Sentry project. (The error screen still says an error was tracked to Sentry; that is upstream's text, and nothing is sent.)
   - `scripts/woff2/woff2-vite-plugins.js`: fonts are served from the app's own address instead of the upstream authors' CDN.
2. **Features that need the upstream authors' servers are switched off,** in one place: `WITHOUT_UPSTREAM_SERVERS` in `excalidraw-app/tofu.ts`, used in `excalidraw-app/App.tsx`.
   - Live collaboration (their socket server and Firebase project): switched off the way upstream switches it off when the app runs in an iframe, so there is no Share button, no collaboration menu item or command, and the collaboration component is not mounted. The Excalidraw+ banner that sits next to the Share button goes with it.
   - Shareable links (json.excalidraw.com): the Shareable link card is gone from Save to…, and opening a `#json=` link made on excalidraw.com loads the visitor's own drawing instead.
   - Collaboration room links (`#room=`): ignored; the visitor's own drawing loads.
   - Export to Excalidraw+: the card in Save to…, the command palette item, the action in the "replace your drawing?" dialog and the `/excalidraw-plus-export` window are off.
   - AI (their AI backend): Text to diagram and Wireframe to code are hidden (`aiEnabled={false}`) and the AI components are not mounted. Mermaid to Excalidraw, which runs in the browser, stays.
3. **Tofu's safety check passes.** Run locally over upstream's tree, it refused the deployment twice:
   - `.env.production`, `.env.development`: they held the web config, Google API key included, of the upstream authors' Firebase projects. This copy never uses them, so the config is `{}`.
   - `.github/workflows/sentry-production.yml` (removed): upstream's release job, which installs `sentry-cli` with `curl | bash` and uploads source maps to their Sentry project. It never runs for this copy.
4. **The build Tofu runs.**
   - `scripts/tofu-build.mjs` (new), described above.
   - `package.json`: `build` runs `node scripts/tofu-build.mjs` (upstream: `yarn --cwd ./excalidraw-app build`).
   - `vercel.json`: `installCommand` is `yarn install --frozen-lockfile` (upstream: `yarn install`), `buildCommand` is `yarn build`, and `outputDirectory` is `dist` (upstream: `excalidraw-app/build`). Removed the redirect that sent every path on the host `vscode.excalidraw.com` to the VS Code marketplace: it never applies to a Tofu address, and Tofu's Free plan refuses a hosting config that redirects every path to another website.
5. `TOFU.md`: this file.

The name, logo, favicon and every other piece of upstream branding are unchanged.

## What works with no server at all

- Drawing, with autosave in the browser: the drawing survives a reload, and open tabs stay in sync.
- Open, Save to file (`.excalidraw`), and Export image (PNG, SVG, copy to clipboard).
- Shape libraries kept in the browser, and Mermaid to Excalidraw.
- Installing as an app (PWA), and working offline after the first visit.

## What still reaches the upstream authors, on purpose

- **Browse libraries** opens libraries.excalidraw.com in a new tab. A library picked there comes back through the address and is downloaded from the public address it names (the app accepts only its allow-listed library hosts). Public, with no key, and only when the visitor asks.
- **Publish library** (in the library menu) sends the visitor's library, with the name and links they type, to upstream's library service, which opens a pull request on GitHub. Only when the visitor fills in and submits that form.
- **Links** to Excalidraw+, Sign up, the blog, GitHub, Discord, X and YouTube stay as upstream has them.
- **Fonts**: a font the app's own address cannot serve falls back to esm.sh (the npm package). With the built site intact this does not happen.
- The page's canonical address and social-card tags still name excalidraw.com, and `vercel.json` keeps upstream's headers (`Access-Control-Allow-Origin: https://excalidraw.com` only affects reads from other websites) and its `/webex` redirect to upstream's Webex integration.

## Turning the switched-off features back on

For someone who runs their own collaboration server, share-link store, Firebase project or AI backend: set `WITHOUT_UPSTREAM_SERVERS` to `false` in `excalidraw-app/tofu.ts`, remove the empty addresses in `scripts/tofu-build.mjs`, and put their own addresses and Firebase config in `.env.production`.

## Safety check

Tofu's own safety check (`scanProject` from `@tofu/gate`, the function Tofu runs before every deployment), run locally over this branch: **passes**. Two findings that do not block remain, both in upstream code:

- medium, `packages/excalidraw/subset/woff2/woff2-bindings.ts`: "Code is executed from a value built at runtime", the Emscripten-generated loader of the font subsetting WebAssembly module;
- low, `examples/with-script-in-browser/package.json`: `@excalidraw/excalidraw` has no pinned version. The example is not part of the app.

## Verification (2026-10-23)

Done on a fresh copy of this branch made with `git archive` (what the importer downloads), with no `.git` folder:

1. `yarn install --frozen-lockfile` (Yarn 1.22.22): completes with the repository's lockfile unchanged.
2. `yarn build`: completes; `dist/index.html` is written, with no reference to the analytics script, Sentry, the upstream font CDN, Google Fonts, json.excalidraw.com, the collaboration server, the AI backend or a Google API key.
3. `python3 -m http.server <port> --directory dist`, then `curl` of `/`, `/manifest.webmanifest`, `/sw.js`, the main script and style sheet and the preloaded fonts: HTTP 200 for each.
4. A headless Chromium run against that server: the page loads; there is no Share or Live collaboration button or menu item and no AI tool, while Mermaid to Excalidraw is offered; a rectangle drawn on the canvas is autosaved and is still there after a reload; Save to… offers only Save to disk, and Save to file downloads a `.excalidraw` file that holds the rectangle; `#json=` and `#room=` links load the local drawing with no prompt; there are no page errors; and the page requests nothing from any address but its own.
5. Tofu's safety check over the archive's files: passes (see above).

## Upstream and licence

- Upstream: <https://github.com/excalidraw/excalidraw>, branch `master`, commit `b7de45e88111f5680ae4bb3c3f3541c7d3b279fe` (2026-10-23).
- This fork: `master` mirrors upstream untouched; `tofu` holds the commits described above; the gallery pins the tag `pin/2026-10-23`.
- Licence: MIT. `LICENSE` is unchanged ("Copyright (c) 2020 Excalidraw"). The MIT licence asks that its copyright and permission notice stay with every copy, which they do; it asks for no notice of changes, and the changes are listed above. The bundled fonts keep their own licences and are not changed.
- Taking a newer upstream version: merge `master` into `tofu`. The upstream files this branch changes are the ones listed above; `excalidraw-app/App.tsx` is the one most likely to need a hand-merge.
