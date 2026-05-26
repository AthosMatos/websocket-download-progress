# downloadProgress

A monorepo demo for chunked download/upload progress using WebSockets.

The project includes:

- `apps/api` — a NestJS WebSocket server that streams a sample image in chunks and accepts chunked uploads.
- `apps/web` — a React + Vite application that displays download/upload progress in real time.
- `packages/ui` — shared UI components used by the web app.
- `packages/logger` — shared logging utilities used by the API.
- `consts` — shared constant definitions for API event names and other shared values.

## Architecture

- The frontend connects to the backend via Socket.IO.
- The backend sends file chunks and progress events for download.
- The frontend slices uploads into chunks, sends them over WebSocket, and renders upload progress.
- The workspace is powered by Turborepo and PNPM Workspaces.

## Requirements

- Node.js `>=18`
- `pnpm` (workspace configured for `pnpm@8.15.6`)

## Getting Started

Install dependencies from the repository root:

```bash
pnpm install
```

### Run both apps in development

```bash
pnpm run dev
```

This runs the workspace `dev` pipeline via Turborepo.

### Run apps individually

```bash
pnpm --filter @downloadprogress/api dev
pnpm --filter @downloadprogress/web dev
```

## Build

From the repository root:

```bash
pnpm run build
```

This builds all workspace packages and apps through Turborepo.

## Lint & Format

```bash
pnpm run lint
pnpm run format
```

## Test

```bash
pnpm run test
```

## App Details

### Backend (`apps/api`)

- Uses NestJS with a WebSocket gateway.
- Listens on `PORT` or `3000` by default.
- Streams `assets/M90 (NGC 4569).jpg` in 64KB chunks as a download demo.
- Accepts chunked file uploads and reports upload progress.

Start the backend directly:

```bash
pnpm --filter @downloadprogress/api dev
```

### Frontend (`apps/web`)

- React 19 application built with Vite.
- Connects to `http://localhost:3000` by default.
- Shows download and upload progress in real time.

Start the frontend directly:

```bash
pnpm --filter @downloadprogress/web dev
```

## Workspace Packages

- `@downloadprogress/ui` — shared component package.
- `@downloadprogress/logger` — shared logger package.
- `@downloadprogress/eslint-config` and `@downloadprogress/typescript-config` — workspace lint/type settings.

## Notes

- The frontend API URL is set to `http://localhost:3000` in `apps/web/src/App.tsx`.
- The backend gateway implementation is in `apps/api/src/websocket.gateway.ts`.
- Shared event constants live under `consts/api/apiEvents.ts`.

## License

This repository is private and configured with workspace-private packages.
