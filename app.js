// Asset Tag QR Lookup (static site)
// Updates: better camera permission UX + HTTPS/in-app browser detection + clearer errors

let records = [];
let recordMap = new Map();
let html5Qr = null;
let currentCameraId = null;

const el = (id) => document.getElementById(id);

function normalize(s){
  return String(s ?? "").trim();
}
function normKey(s){
  return normalize(s).toUpperCase();
}

function buildMap(list){
  recordMap = new Map();
  for (const r of list){
    const tag = normalize(r["FULL UNIQUE ASSET TAG"]);
    if (!tag) continue;
    recordMap.set(normKey(tag), r);
  }
}

function setStatus(msg, isError=false){
  const s = el("status");
  s.textContent = msg;
  s.style.color = isError ? "#ffb3c0" : "";
}

function lookup(code){
  const k = normKey(code);
  if (!k) return null;
  return recordMap.get(k) || null;
}

function setQRPreview(tag){
  const img = el("qrPreview");
  if (!tag) { img.removeAttribute("src"); return; }
  img.src = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(tag);
}

function showResult(scanned, rec){
  el("scannedText").textContent = scanned ? scanned : "—";

  if (!rec){
    el("result").classList.add("hidden");
    el("noResult").classList.remove("hidden");
    el("noResult").textContent = scanned ? `No record found for: ${scanned}` : "No record loaded yet. Scan a code or search.";
    setQRPreview("");
    return;
  }

  el("noResult").classList.add("hidden");
  el("result").classList.remove("hidden");

  const tag = normalize(rec["FULL UNIQUE ASSET TAG"]);
  el("tagValue").textContent = tag;
  setQRPreview(tag);

  const tbody = el("resultTable").querySelector("tbody");
  tbody.innerHTML = "";

  for (const [k,v] of Object.entries(rec)){
    if (v === null || v === undefined || normalize(v) === "") continue;

    const tr = document.createElement("tr");
    const tdK = document.createElement("td");
    const tdV = document.createElement("td");

    tdK.textContent = k;
    tdV.textContent = String(v);

    tr.appendChild(tdK);
    tr.appendChild(tdV);
    tbody.appendChild(tr);
  }
}

function detectInAppBrowser(){
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|Line|WhatsApp|wv;|WebView|Teams|Slack/.test(ua);
}

async function requestCameraPermission(){
  // Triggers the browser permission prompt by requesting a video stream.
  try{
    if (!window.isSecureContext){
      setStatus("Camera requires HTTPS. Open via GitHub Pages (https://...).", true);
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    // Immediately stop tracks — we just wanted the permission prompt.
    stream.getTracks().forEach(t => t.stop());
    setStatus("Camera permission granted. You can start scanning.");
    await listCameras();
  }catch(err){
    console.error(err);
    setStatus("Camera permission denied/blocked. Allow Camera in browser settings and reload.", true);
  }
}

async function loadData(){
  try{
    const res = await fetch("./data.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    records = await res.json();
    buildMap(records);
    setStatus(`Loaded ${records.length.toLocaleString()} records.`);
  }catch(err){
    console.error(err);
    setStatus("Failed to load data.json. Make sure it is in the same folder as index.html.", true);
  }
}

async function listCameras(){
  try{
    const select = el("cameraSelect");
    select.innerHTML = "";

    if (!window.isSecureContext){
      select.disabled = true;
      return;
    }

    const devices = await Html5Qrcode.getCameras();
    if (!devices || devices.length === 0){
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No camera found";
      select.appendChild(opt);
      select.disabled = true;
      return;
    }

    for (const d of devices){
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.label || `Camera ${select.length+1}`;
      select.appendChild(opt);
    }

    currentCameraId = devices[0].id;
    select.value = currentCameraId;
    select.disabled = false;
    select.onchange = () => { currentCameraId = select.value; };

  }catch(err){
    console.error(err);
    setStatus("Unable to list cameras. Click 'Request Camera Permission' first.", true);
  }
}

async function startScan(){
  if (!records.length){
    setStatus("Data not loaded yet.", true);
    return;
  }
  if (!window.isSecureContext){
    setStatus("Camera requires HTTPS. Open via GitHub Pages (https://...).", true);
    return;
  }

  const startBtn = el("startBtn");
  const stopBtn = el("stopBtn");
  startBtn.disabled = true;
  stopBtn.disabled = false;

  if (!html5Qr){
    html5Qr = new Html5Qrcode("qr-reader");
  }

  const config = { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true };

  try{
    await html5Qr.start(
      currentCameraId ? { deviceId: { exact: currentCameraId } } : { facingMode: "environment" },
      config,
      (decodedText) => {
        const code = normalize(decodedText);
        const rec = lookup(code);
        showResult(code, rec);
      },
      () => {}
    );
    setStatus("Scanning… point the camera at the QR code.");
  }catch(err){
    console.error(err);
    let msg = "Failed to start camera. ";
    if (String(err).toLowerCase().includes("permission")) msg += "Allow camera permission and try again.";
    else msg += "Try 'Request Camera Permission' then Start Scan.";
    setStatus(msg, true);
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

async function stopScan(){
  const startBtn = el("startBtn");
  const stopBtn = el("stopBtn");
  stopBtn.disabled = true;

  try{
    if (html5Qr){
      await html5Qr.stop();
      await html5Qr.clear();
    }
    setStatus(`Loaded ${records.length.toLocaleString()} records.`);
  }catch(err){
    console.error(err);
    setStatus("Stopped (with warnings).", true);
  }finally{
    startBtn.disabled = false;
  }
}

function wireUI(){
  el("permBtn").addEventListener("click", requestCameraPermission);
  el("startBtn").addEventListener("click", startScan);
  el("stopBtn").addEventListener("click", stopScan);

  el("searchBtn").addEventListener("click", () => {
    const code = el("manualInput").value;
    const rec = lookup(code);
    showResult(normalize(code), rec);
  });

  el("testBtn").addEventListener("click", async () => {
    const code = prompt("Paste a FULL UNIQUE ASSET TAG to test lookup:");
    if (code === null) return;
    const rec = lookup(code);
    showResult(normalize(code), rec);
  });

  el("manualInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") el("searchBtn").click();
  });

  el("clearBtn").addEventListener("click", () => {
    el("manualInput").value = "";
    showResult("", null);
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  wireUI();

  // show warnings
  if (!window.isSecureContext) el("httpsWarning").classList.remove("hidden");
  if (detectInAppBrowser()) el("browserWarning").classList.remove("hidden");

  await loadData();
  await listCameras();
});
