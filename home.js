import { setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { resinRef } from "./firebase.js";

const MAX_RESIN = 200;
const REGEN_MS = 8 * 60 * 1000;

let data = { currentResin: 0, condensedResin: 0, lastUpdate: Date.now() };

function updateUI() {
  if (!data) return;

  const resinEl = document.getElementById("resinText");
  const nextEl = document.getElementById("nextText");
  const fullInEl = document.getElementById("fullResinText");
  const clockEl = document.getElementById("clockText");
  const targetEl = document.getElementById("targetFullClockText");
  const condText = document.getElementById("condensedText");

  const now = Date.now();
  const lastUpdate = Number(data.lastUpdate) || now;
  const msPassed = now - lastUpdate;
  const resinToGain = Math.floor(msPassed / REGEN_MS);
  const currentActualResin = Math.min(MAX_RESIN, (Number(data.currentResin) || 0) + resinToGain);

  resinEl.innerText = `${currentActualResin} / ${MAX_RESIN}`;
  condText.innerText = `Condensed: ${data.condensedResin || 0} / 5`;
  clockEl.innerText = new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' });

  if (currentActualResin >= MAX_RESIN) {
    nextEl.innerText = "MAX CAPACITY";
    fullInEl.innerText = "0j 0m 0d";
    targetEl.innerText = "FULL";
    return;
  }

  const remainingMs = REGEN_MS - (msPassed % REGEN_MS);
  const m = Math.floor(remainingMs / 60000);
  const s = Math.floor((remainingMs % 60000) / 1000);
  nextEl.innerText = `+1 in ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const resinNeeded = MAX_RESIN - currentActualResin;
  const totalMsToFull = ((resinNeeded - 1) * REGEN_MS) + remainingMs;
  if (totalMsToFull > 0) {
    const days = Math.floor(totalMsToFull / (24 * 60 * 60 * 1000));
    const hours = Math.floor((totalMsToFull % (24 * 60 * 60 * 1000)) / 3600000);
    const mins = Math.floor((totalMsToFull % 3600000) / 60000);
    const secs = Math.floor((totalMsToFull % 60000) / 1000);
    let timeString = "";
    if (days > 0) {
      timeString = `${days}h ${hours}j ${mins}m ${secs}d`;
    } else {
      timeString = `${hours}j ${mins}m ${secs}d`;
    }
    fullInEl.innerText = timeString;
    const fullDate = new Date(now + totalMsToFull);
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    if (days > 0) {
      targetEl.innerText = fullDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }) + " " + 
                           fullDate.toLocaleTimeString('id-ID', options);
    } else {
      targetEl.innerText = fullDate.toLocaleTimeString('id-ID', options);
    }

  } else {
    fullInEl.innerText = "0j 0m 0d";
    targetEl.innerText = "FULL";
  }

  const fullDate = new Date(now + totalMsToFull);
  targetEl.innerText = fullDate.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

async function addResin(amount) {
  const now = Date.now();
  const msPassed = now - (Number(data.lastUpdate) || now);
  const currentActual = Math.min(MAX_RESIN, (Number(data.currentResin) || 0) + Math.floor(msPassed / REGEN_MS));
  let newValue = currentActual + amount;
  if (newValue < 0) {
    alert(`Resin tidak cukup! Anda butuh ${Math.abs(amount)} resin, tapi hanya punya ${currentActual}.`);
    return;
  }
  newValue = Math.min(MAX_RESIN, newValue);
  let newLastUpdate;
  if (currentActual >= MAX_RESIN && newValue < MAX_RESIN) {
    newLastUpdate = now;
  } else {
    const currentModulo = msPassed % REGEN_MS;
    newLastUpdate = now - currentModulo;
  }
  await setDoc(resinRef, { 
    currentResin: newValue, 
    lastUpdate: newLastUpdate 
  }, { merge: true });
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
    const currentModulo = msPassed % REGEN_MS;
    await setDoc(resinRef, {
      currentResin: currentActual - 60, 
      condensedResin: (data.condensedResin || 0) + 1,
      lastUpdate: now - currentModulo 
    }, { merge: true });
  } else {
    alert(`Resin tidak cukup! Butuh 60, saat ini hanya ada ${currentActual}.`);
  }
}

// --- Logic Buka Settings ---
document.getElementById("settingsToggle").addEventListener("click", () => {
  // Buka jendela layaknya aplikasi Desktop
  window.open(
    'settings.html', 
    'SettingsWindow', 
    'width=550,height=420,resizable=no,scrollbars=no'
  );
});

document.getElementById("themeToggle").addEventListener("click", () => {
  if (document.body.classList.contains("light-mode")) {
    document.body.classList.remove("light-mode");
    document.getElementById("themeIcon").innerText = "🌙";
    localStorage.setItem("theme", "dark");
  } else {
    document.body.classList.add("light-mode");
    document.getElementById("themeIcon").innerText = "☀️";
    localStorage.setItem("theme", "light");
  }
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
    setDoc(resinRef, { condensedResin: (data.condensedResin || 0) - 1 }, { merge: true });
  }
});

onSnapshot(resinRef, (snapshot) => {
  if (snapshot.exists()) {
    data = snapshot.data();
    updateUI();
  }
});

setInterval(updateUI, 1000);
