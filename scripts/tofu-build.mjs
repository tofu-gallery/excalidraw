#!/usr/bin/env node
// Tofu: the build Tofu runs for this copy (`yarn build`, named in vercel.json).
//
// It builds excalidraw-app the way upstream's own self-hosting build does
// (`build:app:docker` in excalidraw-app/package.json: Sentry and tracking off),
// stamps the version like upstream's `build:version`, then moves the finished
// site from excalidraw-app/build to dist/ at the repository root, which is
// where Tofu's `vite` preset serves it from. See TOFU.md.

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = path.join(root, "excalidraw-app");
const appBuild = path.join(app, "build");
const dist = path.join(root, "dist");

// vite's package.json does not export its bin, so find it from the package.
const vitePackage = path.join(root, "node_modules", "vite", "package.json");
const viteBin = path.join(
  path.dirname(vitePackage),
  JSON.parse(readFileSync(vitePackage, "utf8")).bin.vite,
);

const run = (args, env = {}) =>
  execFileSync(process.execPath, args, {
    cwd: app,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });

rmSync(appBuild, { recursive: true, force: true });
run([viteBin, "build"], {
  VITE_APP_DISABLE_SENTRY: "true",
  VITE_APP_ENABLE_TRACKING: "false",
  // The features that use these servers of the upstream authors are switched
  // off in excalidraw-app/tofu.ts; leaving their addresses out of the build
  // as well means no code path in it can reach them.
  VITE_APP_BACKEND_V2_GET_URL: "",
  VITE_APP_BACKEND_V2_POST_URL: "",
  VITE_APP_WS_SERVER_URL: "",
  VITE_APP_AI_BACKEND: "",
  VITE_APP_FIREBASE_CONFIG: "{}",
});
run([path.join(root, "scripts", "build-version.js")]);

if (!existsSync(path.join(appBuild, "index.html"))) {
  throw new Error("tofu-build: excalidraw-app/build/index.html was not built");
}
rmSync(dist, { recursive: true, force: true });
renameSync(appBuild, dist);

// The UI font (Assistant) is referenced as /fonts/Assistant/*.woff2 (see
// scripts/woff2/woff2-vite-plugins.js), which upstream serves from its CDN;
// the build does not emit those files, so copy them in.
const assistant = path.join(
  root,
  "packages",
  "excalidraw",
  "fonts",
  "Assistant",
);
for (const file of readdirSync(assistant)) {
  if (file.endsWith(".woff2")) {
    cpSync(
      path.join(assistant, file),
      path.join(dist, "fonts", "Assistant", file),
    );
  }
}
console.log("tofu-build: the site is in dist/");
