# Asset Tag Lookup (Option 2: Scan from Image)

This is a static GitHub Pages app that **does not use live camera streaming**.
It decodes QR codes from an uploaded image (or a photo taken via the phone camera app).

## Deploy
Upload these files to your repo root:
- `index.html`
- `styles.css`
- `app.js`
- `data.json`

Enable GitHub Pages:
Settings → Pages → Deploy from branch → `main` / `(root)`.

## Usage
- Tap **Take Photo** to open the phone camera app, take a QR photo, and it will decode.
- Or tap **Upload QR Image** to select an existing image.
- Manual search is always available.

## Updating data
Replace `data.json` and commit.
