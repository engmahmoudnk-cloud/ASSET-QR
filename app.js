let records = [];
let recordMap = new Map();
let decoder = null;

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
  el("decodedText").textContent = scanned ? scanned : "—";

  if (!rec){
    el("result").classList.add("hidden");
    el("noResult").classList.remove("hidden");
    el("noResult").textContent = scanned ? `No record found for: ${scanned}` : "No record loaded yet. Upload an image or search.";
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

async function decodeFile(file){
  try{
    if (!decoder){
      decoder = new Html5Qrcode("qr-sandbox");
    }
    const text = await decoder.scanFile(file, true);
    const code = normalize(text);
    const rec = lookup(code);
    showResult(code, rec);
    setStatus("Decoded from image.");
  }catch(err){
    console.error(err);
    setStatus("Could not decode QR from this image. Try a clearer photo.", true);
  }
}

function wireUI(){
  el("uploadBtn").addEventListener("click", () => el("fileInput").click());
  el("openCameraBtn").addEventListener("click", () => el("captureInput").click());

  el("fileInput").addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) decodeFile(f);
    e.target.value = "";
  });

  el("captureInput").addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) decodeFile(f);
    e.target.value = "";
  });

  el("searchBtn").addEventListener("click", () => {
    const code = el("manualInput").value;
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
  await loadData();
});
