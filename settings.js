import { getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { resinRef } from "./firebase.js";

const MAX_RESIN = 200;
const REGEN_MS = 8 * 60 * 1000; // 8 Menit

// --- Helper Functions ---
async function getCurrentData() {
  const snap = await getDoc(resinRef);
  return snap.exists() ? snap.data() : { currentResin: 0, condensedResin: 0, lastUpdate: Date.now() };
}

// Logic Set Resin
// Ganti bagian Logic Set Resin di settings.js dengan ini:
document.getElementById("btnSetResin").addEventListener("click", async () => {
  const box = document.getElementById("setResinBox");
  const val = parseInt(box.value);

  if (!isNaN(val) && val >= 0) {
    const data = await getCurrentData();
    const now = Date.now();
    
    // Ambil sisa milidetik dari timer yang sedang berjalan agar tidak reset ke 8:00
    const msPassed = now - (Number(data.lastUpdate) || now);
    const currentModulo = msPassed % REGEN_MS;

    await setDoc(resinRef, {
      currentResin: Math.min(val, MAX_RESIN),
      // Kita geser lastUpdate agar 'sisa waktu' tetap sama seperti sebelum di-edit
      lastUpdate: now - currentModulo 
    }, { merge: true });

    box.value = "";
    alert("Resin updated! Timer preserved.");
  } else {
    alert("Please enter a valid Resin number!");
  }
});

// Logic Set Condensed
document.getElementById("btnSetCondensed").addEventListener("click", async () => {
  const box = document.getElementById("setCondensedBox");
  const val = parseInt(box.value);

  if (!isNaN(val) && val >= 0 && val <= 5) {
    await setDoc(resinRef, { condensedResin: val }, { merge: true });
    box.value = "";
    alert("Condensed Resin berhasil diubah!");
  } else {
    alert("Please enter a number (0-5)!");
  }
});

// Logic Set Timer (Sinkronisasi dengan regenerasi JS yang menggunakan ms)
document.getElementById("btnSetTime").addEventListener("click", async () => {
  const box = document.getElementById("setTimeBox");
  const input = box.value.trim();

  if (input.length !== 5 || input[2] !== ':') {
    alert("Invalid format! Must be 5 characters (MM:SS).\nExample: 07:59");
    return;
  }

  const parts = input.split(':');
  const minutes = parseInt(parts[0]);
  const seconds = parseInt(parts[1]);

  if (!isNaN(minutes) && !isNaN(seconds)) {
    if (seconds >= 60) {
      alert("Seconds cannot be 60 or more!");
      return;
    }

    // Hitung real-time resin sebelum kita menggeser timer
    // Ini agar resin saat ini dikunci menjadi 'currentResin' sebelum timer diatur ulang.
    const data = await getCurrentData();
    const msPassed = Date.now() - (Number(data.lastUpdate) || Date.now());
    const gained = Math.floor(msPassed / REGEN_MS);
    const currentActual = Math.min(MAX_RESIN, Number(data.currentResin) + gained);

    // Hitung mundur ms yang dibutuhkan untuk waktu timer yang dimasukkan
    const targetMsLeft = (minutes * 60 + seconds) * 1000;
    
    // Karena JS membaca: remaining = REGEN_MS - (Date.now() - lastUpdate) % REGEN_MS
    // Maka: lastUpdate = Date.now() - (REGEN_MS - targetMsLeft)
    const newLastUpdate = Date.now() - (REGEN_MS - targetMsLeft);

    await setDoc(resinRef, {
      currentResin: currentActual, 
      lastUpdate: newLastUpdate
    }, { merge: true });

    box.value = "";
    alert(`Timer diubah menjadi ${input}!`);
  } else {
    alert("Minutes and Seconds must be numbers!");
  }
});

// Logic Reset All
document.getElementById("btnResetAll").addEventListener("click", async () => {
  if (confirm("Are you sure you want to reset ALL data (Resin, Condensed, and Timer) to 0?")) {
    await setDoc(resinRef, {
      currentResin: 0,
      condensedResin: 0,
      lastUpdate: Date.now()
    });

    document.getElementById("setResinBox").value = "";
    document.getElementById("setCondensedBox").value = "";
    document.getElementById("setTimeBox").value = "";
    
    alert("All data has been reset!");
  }
});

// Logic Close
document.getElementById("btnClose").addEventListener("click", () => {
  window.close();
});