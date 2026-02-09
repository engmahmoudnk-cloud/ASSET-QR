# Asset Tag QR Lookup (Static Web App)

This repository is a **static** web app that:
- Scans a QR code (expected to encode the **FULL UNIQUE ASSET TAG** text), or lets you paste/search manually.
- Loads `data.json` and shows **all related information** for the matching record.

## Files
- `index.html` – UI
- `styles.css` – styling
- `app.js` – QR scanning + lookup logic
- `data.json` – your asset register records (generated from your uploaded JSON)

## Deploy on GitHub Pages (recommended)
1. Create a new GitHub repository (or open your existing one).
2. Upload these files to the repo root.
3. In GitHub: **Settings → Pages**
   - **Source**: Deploy from a branch
   - **Branch**: `main` / `(root)`
4. Wait for GitHub Pages to publish, then open the Pages URL on your phone.
   - Camera access requires **HTTPS** (GitHub Pages is HTTPS).

## Updating the data (when you change the asset register)
Replace `data.json` with the new one and **commit**.
- Hard refresh on phone/browser if it still shows old data (cache): refresh + clear site data, or open in incognito.

## Notes
- Matching key: `FULL UNIQUE ASSET TAG`
- If your QR code encodes something else (e.g., an ID), tell me and I will adjust the lookup rule.
