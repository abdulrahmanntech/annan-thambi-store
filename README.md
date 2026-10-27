# ANNAN THAMBI STORE – Backend

A small Node.js server (no packages to install). It serves the billing app and
saves all shop data on the server, so every phone/computer opens the same data.

## Run
1. Install Node.js (version 16 or newer) from https://nodejs.org
2. In this folder run:  `node server.js`
3. Open http://localhost:3000
   Other devices on the same Wi-Fi: http://<server-computer-IP>:3000

## Files
- `server.js`        – the backend (API + file server)
- `public/index.html`– the app (same as your index.html, but saves to the server)
- `data/store.json`  – created automatically; all your data
- `data/backups/`    – one backup copy per day, created automatically

## API
- GET  /api/health  – check the server is running
- GET  /api/data    – returns { rev, data }
- PUT  /api/data    – body { rev, data }; rejected with 409 if another device saved first
- GET  /api/backup  – downloads the full data as a JSON file

## Notes
- If the server is not running, the app shows "Server not reachable" and changes are NOT saved.
- Existing browser data is not moved automatically. In the old app use Settings → Backup
  to download your data, then Restore it in this server version once.
- There is no login. Use it only on your shop network, or put it behind a password/HTTPS before exposing it to the internet.
