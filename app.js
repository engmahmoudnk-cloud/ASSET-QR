// Asset Tag QR Lookup (static site)
// - Scans QR codes (expected: FULL UNIQUE ASSET TAG text)
// - Looks up record in data.json

let records = [];
let recordMap = new Map();
let html5Qr = null;
let currentCameraId = null;

const el = (id) => document.getElementById(id);

function normalize(s){
  return String(s ?? "").trim();
}

function buildMap(list){
  // Use FULL UNIQUE ASSET TAG as primary key.
  // Also index a few variants: trimmed, uppercased.
  recordMap = new Map();
  for (const r of list){
    const tag = normalize(r["FULL UNIQUE ASSET TAG"]);
    if (!tag) continue;
    const keys = new Set([tag, tag.toUpperCase()]);
    for (const k of keys){
      if (!recordMap.has(k)) recordMap.set(k, r);
    }
  }
}

function setStatus(msg, isError=false){
  const s = el("status");
  s.textContent = msg;
  s.style.color = isError ? "#ffb3c0" : "";
}

function showResult(scanned, rec){
  el("scannedText").textContent = scanned ? scanned : "—";

  if (!rec){
    el("result").classList.add("hidden");
    el("noResult").classList.remove("hidden");
    el("noResult").textContent = scanned ? `No record found for: ${scanned}` : "No record loaded yet. Scan a code or search.";
    return;
  }

  el("noResult").classList.add("hidden");
  el("result").classList.remove("hidden");

  const tag = normalize(rec["FULL UNIQUE ASSET TAG"]);
  el("tagValue").textContent = tag;

  // Render all fields except empty/null
  const tbody = el("resultTable").querySelector("tbody");
  tbody.innerHTML = "";
  const entries = Object.entries(rec);

  for (const [k,v] of entries){
    if (k === "FULL UNIQUE ASSET TAG") continue;
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

function lookup(code){
  const c = normalize(code);
  if (!c) return null;

  // direct + upper
  return recordMap.get(c) || recordMap.get(c.toUpperCase()) || null;
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
    setStatus("Failed to load data.json. Make sure it exists in the same folder.", true);
  }
}

async function listCameras(){
  try{
    const devices = await Html5Qrcode.getCameras();
    const select = el("cameraSelect");
    select.innerHTML = "";

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

    // Choose first by default
    currentCameraId = devices[0].id;
    select.value = currentCameraId;
    select.onchange = () => { currentCameraId = select.value; };

  }catch(err){
    console.error(err);
    setStatus("Unable to list cameras. Camera permission may be blocked.", true);
  }
}

async function startScan(){
  if (!records.length){
    setStatus("Data not loaded yet.", true);
    return;
  }

  const startBtn = el("startBtn");
  const stopBtn = el("stopBtn");
  startBtn.disabled = true;
  stopBtn.disabled = false;

  if (!html5Qr){
    html5Qr = new Html5Qrcode("qr-reader");
  }

  const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    rememberLastUsedCamera: true
  };

  try{
    await html5Qr.start(
      { deviceId: { exact: currentCameraId } },
      config,
      (decodedText) => {
        const code = normalize(decodedText);
        const rec = lookup(code);
        showResult(code, rec);
      },
      (errorMessage) => {
        // ignore scan errors (noise)
      }
    );
    setStatus("Scanning… point the camera at the QR code.");
  }catch(err){
    console.error(err);
    setStatus("Failed to start camera. Allow camera permission and try again.", true);
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
  el("startBtn").addEventListener("click", startScan);
  el("stopBtn").addEventListener("click", stopScan);

  el("searchBtn").addEventListener("click", () => {
    const code = el("manualInput").value;
    const rec = lookup(code);
    showResult(normalize(code), rec);
  });

  el("manualInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter"){
      el("searchBtn").click();
    }
  });

  el("clearBtn").addEventListener("click", () => {
    el("manualInput").value = "";
    showResult("", null);
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  wireUI();
  await loadData();
  await listCameras();
});
