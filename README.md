# Asset Tag QR Lookup (Static Web App)

This static web app:
- Loads `data.json`
- Scans QR codes using the phone camera (QR code should encode the exact text of **FULL UNIQUE ASSET TAG**)
- Looks up the matching record and displays all fields

## Deploy on GitHub Pages (HTTPS required for camera)
1. Upload all files to your repo root:
   - `index.html`, `styles.css`, `app.js`, `data.json`
2. GitHub → **Settings → Pages**
   - Source: Deploy from a branch
   - Branch: `main` / `(root)`
3. Open the Pages URL on your phone (must be `https://...github.io/...`)

## Camera permission tips
- Use HTTPS (lock icon).
- If you opened in WhatsApp/Teams in-app browser, open the link in Safari/Chrome.
- Click **Request Camera Permission** first.
- If permission was denied previously: reset site permissions and reload.

## Updating data
Replace `data.json` and commit changes. Hard refresh if you still see old data.
