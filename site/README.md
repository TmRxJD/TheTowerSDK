# TheTowerSDK — public showcase

This is the documentation site. It lives in `site/` inside the
[TheTowerSDK](https://github.com/TmRxJD/TheTowerSDK) repository — which is what puts it at
`/TheTowerSDK/` rather than the `/TheTowerSDK-site/` it used to publish to — and is excluded
from the published npm package.

Public site for **[thetowersdk](https://www.npmjs.com/package/thetowersdk)**: game data, save reading, and formulas for _The Tower_.

Live: **https://tmrxjd.github.io/TheTowerSDK/**

| Resource                        | URL                                                    |
| ------------------------------- | ------------------------------------------------------ |
| npm                             | https://www.npmjs.com/package/thetowersdk              |
| SDK source                      | https://github.com/TmRxJD/TheTowerSDK                  |
| Run Tracker (built on this SDK) | https://the-tower-run-tracker.com                      |
| AGS public docs                 | https://github.com/TmRxJD/agent-governance-system-site |

## Stack

SvelteKit 5 + Tailwind + adapter-static, GitHub Pages from `build/`.

## Local (port 4173 only — Vite HMR)

This repo owns **http://127.0.0.1:4173/** exclusively. Do not use another port.

Local preview is a **durable Vite dev server with HMR**, started outside the agent shell so it survives Cursor aborting tool runs.

```sh
npm install
npm run serve          # start HMR if needed; no-op if already healthy
npm run serve:status   # confirm mode=hmr on 4173
```

Open **http://127.0.0.1:4173/** — edits hot-reload. **Do not restart** the server unless `serve:status` says `DOWN`.

Agents must never:

- kill port 4173 / stop the Vite or HMR supervisor process
- run `npm ci` / `npm install` / wipe `node_modules` or `.svelte-kit` while HMR is up (crashes Vite via locked native addons)
- run `vite preview` against this port while working locally
- delete `.svelte-kit` while HMR is up

Production / GitHub Pages builds set `BASE_PATH=/TheTowerSDK`, derived from the repository name by the workflow. Local HMR always uses empty `BASE_PATH`. Verify deploys in **GitHub Actions**, not by reinstalling locally.

Enforcement: `.cursor/hooks.json` + `.cursor/hooks/block-preview-server.mjs` (reload Cursor window after clone).

## License

`thetowersdk` is MIT. Tower players can request a free AGS grant (Player ID) from `/license/`.
