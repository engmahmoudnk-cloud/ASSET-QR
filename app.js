let records = [];
let recordMap = new Map();
let html5Qr = null;
let currentCameraId = null;
let torchOn = false;

const el = (id) => document.getElementById(id);
const normalize = (s) => String(s ?? "").trim();
const normKey = (s) => normalize(s).toUpperCase();

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
    tr.appendChild(tdK); tr.appendChild(tdV);
    tbody.appendChild(tr);
  }
}

function isIOS(){ return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream; }

async function loadData(){
  try{
    const res = await fetch("./data.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    records = await res.json();
    buildMap(records);
    setStatus(`Loaded ${records.length.toLocaleString()} records.`);
  }catch(err){
    console.error(err);
    setStatus("Failed to load data.json.", true);
  }
}

async function requestPermission(){
  try{
    if (!window.isSecureContext){
      setStatus("Camera requires HTTPS. Open via GitHub Pages (https://...).", true);
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    stream.getTracks().forEach(t => t.stop());
    setStatus("Permission granted. Start Scan.");
    await listCameras();
  }catch(err){
    console.error(err);
    setStatus("Permission denied/blocked. Allow Camera in browser settings and reload.", true);
  }
}

async function listCameras(){
  try{
    const select = el("cameraSelect");
    select.innerHTML = "";
    if (!window.isSecureContext){ select.disabled = true; return; }

    const devices = await Html5Qrcode.getCameras();
    if (!devices || devices.length === 0){
      const opt = document.createElement("option");
      opt.value = ""; opt.textContent = "No camera found";
      select.appendChild(opt); select.disabled = true; return;
    }

    let preferred = devices[0];
    for (const d of devices){
      const label = (d.label || "").toLowerCase();
      if (label.includes("back") || label.includes("rear") || label.includes("environment")){ preferred = d; break; }
    }

    for (const d of devices){
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.label || "Camera";
      select.appendChild(opt);
    }

    currentCameraId = preferred.id;
    select.value = currentCameraId;
    select.disabled = false;
    select.onchange = () => { currentCameraId = select.value; };

  }catch(err){
    console.error(err);
    setStatus("Unable to list cameras. Click 'Request Permission' first.", true);
  }
}

async function startScan(){
  if (!records.length){ setStatus("Data not loaded yet.", true); return; }
  if (!window.isSecureContext){ setStatus("Camera requires HTTPS.", true); return; }

  el("startBtn").disabled = true;
  el("stopBtn").disabled = false;

  if (!html5Qr){ html5Qr = new Html5Qrcode("qr-reader"); }

  const config = {
    fps: 12,
    qrbox: (vw) => {
      const size = Math.min(280, Math.floor(vw * 0.8));
      return { width: size, height: size };
    },
    rememberLastUsedCamera: true
  };

  try{
    const cam = currentCameraId ? { deviceId: { exact: currentCameraId } } : { facingMode: "environment" };
    await html5Qr.start(cam, config,
      (decodedText) => {
        const code = normalize(decodedText);
        const rec = lookup(code);
        showResult(code, rec);
      },
      () => {}
    );
    el("torchBtn").disabled = false;
    setStatus("Scanning…");
  }catch(err){
    console.error(err);
    el("startBtn").disabled = false;
    el("stopBtn").disabled = true;
    el("torchBtn").disabled = true;
    setStatus(isIOS()
      ? "Camera failed on iPhone. Use Safari + HTTPS. Use 'Scan from Image' as fallback."
      : "Camera failed. Use 'Request Permission' or 'Scan from Image'.", true);
  }
}

async function stopScan(){
  el("stopBtn").disabled = true;
  el("torchBtn").disabled = true;
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
    el("startBtn").disabled = false;
  }
}

async function toggleTorch(){
  if (!html5Qr) return;
  try{
    torchOn = !torchOn;
    await html5Qr.applyVideoConstraints({ advanced: [{ torch: torchOn }] });
    setStatus(torchOn ? "Torch ON" : "Torch OFF");
  }catch(err){
    console.error(err);
    setStatus("Torch not supported.", true);
    torchOn = false;
  }
}

async function scanFromImage(file){
  try{
    if (!html5Qr){ html5Qr = new Html5Qrcode("qr-reader"); }
    const decodedText = await html5Qr.scanFile(file, true);
    const code = normalize(decodedText);
    const rec = lookup(code);
    showResult(code, rec);
    setStatus("Scanned from image.");
  }catch(err){
    console.error(err);
    setStatus("Could not read QR from this image. Try a clearer photo.", true);
  }
}

function wireUI(){
  el("permBtn").addEventListener("click", requestPermission);
  el("startBtn").addEventListener("click", startScan);
  el("stopBtn").addEventListener("click", stopScan);
  el("torchBtn").addEventListener("click", toggleTorch);

  el("uploadBtn").addEventListener("click", () => el("fileInput").click());
  el("fileInput").addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) scanFromImage(f);
    e.target.value = "";
  });

  el("manualFocusBtn").addEventListener("click", () => el("manualInput").focus());

  el("searchBtn").addEventListener("click", () => {
    const code = el("manualInput").value;
    const rec = lookup(code);
    showResult(normalize(code), rec);
  });

  el("manualInput").addEventListener("keydown", (e) => { if (e.key === "Enter") el("searchBtn").click(); });

  el("clearBtn").addEventListener("click", () => {
    el("manualInput").value = "";
    showResult("", null);
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  wireUI();
  if (!window.isSecureContext) el("httpsWarning").classList.remove("hidden");
  if (isIOS()) el("iosHint").classList.remove("hidden");
  await loadData();
  await listCameras();
});
