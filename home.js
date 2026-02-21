import { setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { resinRef } from "./firebase.js";

const MAX_RESIN = 200;
const REGEN_MS = 8 * 60 * 1000;

let data = { currentResin: 0, condensedResin: 0, lastUpdate: Date.now() };

// Ganti fungsi updateUI() lama dengan yang ini
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
  
  // Hitung berapa resin yang didapat sejak update terakhir
  const resinToGain = Math.floor(msPassed / REGEN_MS);
  let currentActualResin = (Number(data.currentResin) || 0) + resinToGain;

  // 1. Logika Berhenti di 200
  if (currentActualResin >= MAX_RESIN) {
    currentActualResin = MAX_RESIN;
    resinEl.innerText = `${MAX_RESIN} / ${MAX_RESIN}`;
    condText.innerText = `Condensed: ${data.condensedResin || 0} / 5`;
    clockEl.innerText = new Date().toLocaleTimeString('id-ID');
    
    nextEl.innerText = "MAX CAPACITY";
    fullInEl.innerText = "0j 0m 0d";
    targetEl.innerText = "FULL";
    return; // Berhenti di sini jika penuh
  }

  // 2. Logika Timer +1 (Reset ke 08:00 jika baru mulai berkurang)
  resinEl.innerText = `${currentActualResin} / ${MAX_RESIN}`;
  condText.innerText = `Condensed: ${data.condensedResin || 0} / 5`;
  clockEl.innerText = new Date().toLocaleTimeString('id-ID');

  // Menghitung sisa waktu menuju +1 berikutnya
  const remainingMs = REGEN_MS - (msPassed % REGEN_MS);
  const m = Math.floor(remainingMs / 60000);
  const s = Math.floor((remainingMs % 60000) / 1000);
  nextEl.innerText = `+1 in ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  // 3. Perhitungan Waktu Sampai Penuh (Full)
  const resinNeeded = MAX_RESIN - currentActualResin;
  // Total waktu = (sisa resin yang dibutuhkan - 1) * 8 menit + sisa waktu ke +1 terdekat
  const totalMsToFull = ((resinNeeded - 1) * REGEN_MS) + remainingMs;

  const days = Math.floor(totalMsToFull / (24 * 60 * 60 * 1000));
  const hours = Math.floor((totalMsToFull % (24 * 60 * 60 * 1000)) / 3600000);
  const mins = Math.floor((totalMsToFull % 3600000) / 60000);
  const secs = Math.floor((totalMsToFull % 60000) / 1000);
  
  fullInEl.innerText = days > 0 ? 
    `${days}h ${hours}j ${mins}m ${secs}d` : 
    `${hours}j ${mins}m ${secs}d`;

  const fullDate = new Date(now + totalMsToFull);
  targetEl.innerText = fullDate.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

// Update fungsi addResin agar mereset timer ke 8 menit saat resin berkurang dari Max
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

  // LOGIKA RESET: Jika sebelumnya penuh (200) dan sekarang berkurang, 
  // maka lastUpdate diset ke 'now' agar timer mulai murni dari 08:00
  let updateTime = now - (msPassed % REGEN_MS);
  if (currentActual >= MAX_RESIN && newValue < MAX_RESIN) {
    updateTime = now;
  }

  await setDoc(resinRef, { 
    currentResin: newValue, 
    lastUpdate: updateTime 
  }, { merge: true });
}

async function craftCondensed() {
  const now = Date.now();
  const msPassed = now - (Number(data.lastUpdate) || now);
  const currentActual = (Number(data.currentResin) || 0) + Math.floor(msPassed / REGEN_MS);

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
    alert("Resin tidak cukup! Butuh 60.");
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

