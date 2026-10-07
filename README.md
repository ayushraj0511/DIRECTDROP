# DirectDrop

DirectDrop is a browser-based peer-to-peer file transfer app using WebRTC, PeerJS signaling, and a temporary session server.

## Run locally

### 1. Install dependencies
```bash
npm install
```

### 2. Start development
```bash
npm run dev
```

This now starts both the API/PeerJS server (port 3000) and Vite (port 5173) automatically. You no longer need a second terminal.

Open:
- `http://localhost:5173` during development
- `http://localhost:3000` when running the production build through the server

The Vite development server proxies `/api/*` and `/peerjs/*` to port `3000`.

## Production build

```bash
npm run build
npm start
```

## Environment variables

- `PORT` — HTTP server port, default `3000`
- `SESSION_TTL_MS` — temporary session lifetime, default 30 minutes
- `MAX_JOIN_ATTEMPTS_PER_MINUTE` — per-IP join attempts, default 30
- `TURN_URL` — optional TURN server URL for networks where direct WebRTC connectivity fails
- `TURN_USERNAME` — optional TURN username
- `TURN_CREDENTIAL` — optional TURN credential

## Important

DirectDrop does not upload file contents to the session server. The server coordinates temporary session discovery; the file is transferred between browsers over WebRTC when the network permits it.
