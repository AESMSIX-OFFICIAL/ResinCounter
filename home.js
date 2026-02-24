import { setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { resinRef } from "./firebase.js";

const MAX_RESIN = 200;
const REGEN_MS = 8 * 60 * 1000;

let data = { currentResin: 0, condensedResin: 0, lastUpdate: Date.now() };

async function updateResinDatabase(newData) {
  const payload = { ...newData };
  if (newData.lastUpdate) {
    payload.lastUpdateReadable = new Date(newData.lastUpdate).toLocaleString('id-ID');
    payload.serverSync = new Date().toISOString();
  }
  await setDoc(resinRef, payload, { merge: true });
}

async function initializeDefaultData() {
  const defaultData = {
    currentResin: 0,
    condensedResin: 0,
    lastUpdate: Date.now(),
    lastUpdateReadable: new Date().toLocaleString('id-ID'),
    serverSync: new Date().toISOString()
  };
  await setDoc(resinRef, defaultData);
}

function updateUI() {
  if (!data) return;

  const resinEl = document.getElementById("resinText");
  const nextEl = document.getElementById("nextText");
  const fullInEl = document.getElementById("fullResinText");
  const clockEl = document.getElementById("clockText");
  const targetEl = document.getElementById("targetFullClockText");
  const condText = document.getElementById("condensedText");
  const lblSelesai = document.querySelectorAll(".lbl")[1]; // Mengambil label "Selesai Dalam"

  const now = Date.now();
  const lastUpdate = Number(data.lastUpdate) || now;
  const msPassed = now - lastUpdate;
  const resinToGain = Math.floor(msPassed / REGEN_MS);
  
  // Kalkulasi resin saat ini
  const currentActualResin = Math.min(MAX_RESIN, (Number(data.currentResin) || 0) + resinToGain);

  resinEl.innerText = `${currentActualResin} / ${MAX_RESIN}`;
  condText.innerText = `Condensed: ${data.condensedResin || 0} / 5`;
  clockEl.innerText = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // LOGIKA BARU: Jika Resin Penuh
  if (currentActualResin >= MAX_RESIN) {
    lblSelesai.innerText = "Selesai Sejak";
    nextEl.innerText = "MAX CAPACITY";
    targetEl.innerText = "FULL";

    // Hitung kapan sebenarnya dia menyentuh 200
    const resinNeededToMax = MAX_RESIN - (Number(data.currentResin) || 0);
    const msToReachMax = resinNeededToMax * REGEN_MS;
    const timeAtFull = lastUpdate + msToReachMax;
    const overflowMs = now - timeAtFull;

    // Format waktu yang berlalu (Overflow)
    const oHours = Math.floor(overflowMs / 3600000);
    const oMins = Math.floor((overflowMs % 3600000) / 60000);
    const oSecs = Math.floor((overflowMs % 60000) / 1000);
    
    fullInEl.innerText = `${oHours}j ${oMins}m ${oSecs}d`;
    return;
  }

  // Jika Resin BELUM Penuh (Kembali ke mode default)
  lblSelesai.innerText = "Selesai Dalam";
  const remainingMs = REGEN_MS - (msPassed % REGEN_MS);
  const m = Math.floor(remainingMs / 60000);
  const s = Math.floor((remainingMs % 60000) / 1000);
  nextEl.innerText = `+1 in ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  const resinNeeded = MAX_RESIN - currentActualResin;
  const totalMsToFull = ((resinNeeded - 1) * REGEN_MS) + remainingMs;

  const days = Math.floor(totalMsToFull / (24 * 60 * 60 * 1000));
  const hours = Math.floor((totalMsToFull % (24 * 60 * 60 * 1000)) / 3600000);
  const mins = Math.floor((totalMsToFull % 3600000) / 60000);
  const secs = Math.floor((totalMsToFull % 60000) / 1000);

  fullInEl.innerText = days > 0 ? `${days}h ${hours}j ${mins}m ${secs}d` : `${hours}j ${mins}m ${secs}d`;

  const fullDate = new Date(now + totalMsToFull);
  const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
  const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
  
  targetEl.innerHTML = `
    <div style="font-size: 0.8em; opacity: 0.8;">${fullDate.toLocaleDateString('id-ID', dateOptions)}</div>
    <div>${fullDate.toLocaleTimeString('id-ID', timeOptions)}</div>
  `;
}

async function addResin(amount) {
  const now = Date.now();
  const msPassed = now - (Number(data.lastUpdate) || now);
  const currentActual = Math.min(MAX_RESIN, (Number(data.currentResin) || 0) + Math.floor(msPassed / REGEN_MS));
  
  let newValue = currentActual + amount;
  if (newValue < 0) {
    alert(`Resin tidak cukup!`);
    return;
  }
  
  newValue = Math.min(MAX_RESIN, newValue);
  const newLastUpdate = (currentActual >= MAX_RESIN && newValue < MAX_RESIN) ? now : now - (msPassed % REGEN_MS);

  await updateResinDatabase({
    currentResin: newValue,
    lastUpdate: newLastUpdate
  });
}

async function craftCondensed() {
  const now = Date.now();
  const msPassed = now - (Number(data.lastUpdate) || now);
  const currentActual = Math.min(MAX_RESIN, (Number(data.currentResin) || 0) + Math.floor(msPassed / REGEN_MS));

  if (currentActual >= 60) {
    if ((data.condensedResin || 0) >= 5) {
      alert("Condensed Resin sudah maksimal (5/5)!");
      return;
    }

    const newLastUpdate = (currentActual >= MAX_RESIN) ? now : now - (msPassed % REGEN_MS);

    await updateResinDatabase({
      currentResin: currentActual - 60,
      condensedResin: (data.condensedResin || 0) + 1,
      lastUpdate: newLastUpdate
    });
  } else {
    alert(`Resin tidak cukup! Butuh 60.`);
  }
}

document.getElementById("settingsToggle").addEventListener("click", () => {
  window.open('settings.html', 'SettingsWindow', 'width=550,height=420,resizable=no,scrollbars=no');
});

document.getElementById("themeToggle").addEventListener("click", () => {
  const isLight = document.body.classList.toggle("light-mode");
  document.getElementById("themeIcon").innerText = isLight ? "☀️" : "🌙";
  localStorage.setItem("theme", isLight ? "light" : "dark");
});

if (localStorage.getItem("theme") === "light") {
  document.body.classList.add("light-mode");
  document.getElementById("themeIcon").innerText = "☀️";
}

document.querySelectorAll("button[data-amount]").forEach(btn => {
  btn.addEventListener("click", () => addResin(parseInt(btn.dataset.amount)));
});

document.getElementById("craftCondensed").addEventListener("click", craftCondensed);

document.getElementById("useCondensed").addEventListener("click", () => {
  if ((data.condensedResin || 0) > 0) {
    updateResinDatabase({ condensedResin: (data.condensedResin || 0) - 1 });
  }
});

onSnapshot(resinRef, (snapshot) => {
  if (!snapshot.exists()) {
    initializeDefaultData();
    return;
  }

  const incomingData = snapshot.data();
  const isCorrupt = 
    typeof incomingData.currentResin !== 'number' || 
    typeof incomingData.lastUpdate !== 'number' ||
    incomingData.lastUpdate > Date.now() + 86400000 ||
    incomingData.lastUpdate < 946656000000;

  if (isCorrupt) {
    initializeDefaultData();
  } else {
    data = incomingData;
    updateUI();
  }
});

setInterval(updateUI, 1000);

