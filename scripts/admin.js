// ✅ Firebase Setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  setDoc,
  deleteDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const logoutBtn = document.getElementById("admin-logout-btn");
const welcomeEl = document.getElementById("admin-welcome");
const tournamentForm = document.getElementById("create-tournament-form");
const categorySelect = document.getElementById("category");
const matchTypeSelect = document.getElementById("matchType");
const totalSeatsInput = document.getElementById("totalSeats");
const killPerPKRWrapper = document.getElementById("killPerPKR-wrapper");
const tournamentsContainer = document.getElementById("admin-tournaments");

let editingTournamentId = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "/");
  const adminDoc = await getDoc(doc(db, "admins", user.uid));
  if (!adminDoc.exists()) {
    alert("⛔ Access Denied: You are not an admin.");
    return (window.location.href = "/");
  }
  welcomeEl.textContent = `Welcome, Admin (${user.email})`;
  loadTournaments();
});

logoutBtn.onclick = () => auth.signOut().then(() => (window.location.href = "/"));

categorySelect.addEventListener("change", () => {
  const category = categorySelect.value;
  matchTypeSelect.innerHTML = `<option value="">Select Match Type</option>`;
  totalSeatsInput.disabled = false;
  killPerPKRWrapper.classList.add("hidden");

  if (category === "br") {
    ["Solo", "Duo", "Squad"].forEach((type) => {
      const opt = document.createElement("option");
      opt.value = type;
      opt.textContent = type;
      matchTypeSelect.appendChild(opt);
    });
    killPerPKRWrapper.classList.remove("hidden");
  } else if (category === "cs") {
    ["4v4", "6v6"].forEach((type) => {
      const opt = document.createElement("option");
      opt.value = type;
      opt.textContent = type;
      matchTypeSelect.appendChild(opt);
    });
    totalSeatsInput.disabled = true;
    totalSeatsInput.value = "";
  }
});

tournamentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(tournamentForm);
  const data = Object.fromEntries(formData.entries());
  const startTime = new Date(data.startTime);

  const tournament = {
    title: data.title,
    category: data.category,
    matchType: data.matchType,
    totalSeats: data.category === "cs"
      ? (data.matchType === "4v4" ? 8 : 12)
      : parseInt(data.totalSeats),
    startTime: startTime.toISOString(),
    entryFee: parseInt(data.entryFee),
    prize: data.prize,
    roomType: data.roomType || null,
    roomId: data.roomId || null,
    roomPassword: data.roomPassword || null,
    gameUID: data.gameUID || null,
    requireGameUID: data.requireGameUID === "on",
    status: data.status,
    killPerPkr: data.category === "br" ? data.killPerPkr : null,
    updatedAt: new Date().toISOString()
  };

  if (editingTournamentId) {
    const existingDoc = await getDoc(doc(db, "tournaments", editingTournamentId));
    const prevData = existingDoc.exists() ? existingDoc.data() : {};
    const currentSeatsLeft = prevData.seatsLeft ?? tournament.totalSeats;

    await updateDoc(doc(db, "tournaments", editingTournamentId), {
      ...tournament,
      seatsLeft: currentSeatsLeft
    });
    showMessage("✅ Tournament updated.");
    editingTournamentId = null;
  } else {
    await setDoc(doc(collection(db, "tournaments")), {
      ...tournament,
      seatsLeft: tournament.totalSeats,
      createdAt: new Date().toISOString()
    });
    showMessage("✅ Tournament created!");
  }

  tournamentForm.reset();
  matchTypeSelect.innerHTML = `<option value="">Select Match Type</option>`;
  killPerPKRWrapper.classList.add("hidden");
  totalSeatsInput.disabled = false;
  loadTournaments();
});

export async function loadTournaments() {
  tournamentsContainer.innerHTML = "<p>Loading tournaments...</p>";
  const now = Date.now();
  const snap = await getDocs(query(collection(db, "tournaments"), orderBy("startTime", "desc")));
  tournamentsContainer.innerHTML = "";

  for (const docSnap of snap.docs) {
    const t = docSnap.data();
    const start = new Date(t.startTime).getTime();
    const isExpired = (now - start) > 30 * 60 * 1000 && ["soon", "now"].includes(t.status);
    if (isExpired) continue;

    const div = document.createElement("div");
    div.className = "tournament-card";
    div.innerHTML = `
      <strong>${t.title}</strong>
      <p>Category: ${t.category.toUpperCase()} | Type: ${t.matchType}</p>
      <p class="seat-info" data-id="${docSnap.id}" data-total="${t.totalSeats}">Seats: loading...</p>
      <p>Entry Fee: ${t.entryFee} | Prize: ${t.prize}</p>
      <p>Start Time: ${new Date(t.startTime).toLocaleString()}</p>
      <div class="tournament-time" data-start="${t.startTime}" data-id="${docSnap.id}">Calculating...</div>
      <span class="status-badge status-${t.status}">${t.status}</span>
      <div class="card-actions">
        <button class="action-button view-players" data-id="${docSnap.id}">View Players</button>
        <button class="action-button update" onclick="editTournament('${docSnap.id}')">Edit</button>
        <button class="action-button delete" onclick="deleteTournament('${docSnap.id}')">Delete</button>
      </div>`;
    tournamentsContainer.appendChild(div);
  }

  tournamentsContainer.querySelectorAll(".view-players").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      displayPlayersRightPanel(id);
    });
  });

  updateSeatsLeft();
  updateCountdowns();
}

function updateCountdowns() {
  const now = Date.now();
  document.querySelectorAll(".tournament-time").forEach(span => {
    const start = new Date(span.dataset.start).getTime();
    let diff = start - now;

    if (diff <= 0) {
      span.textContent = "LIVE NOW";
      span.style.color = "lime";
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    diff %= (1000 * 60 * 60 * 24);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    diff %= (1000 * 60 * 60);
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    span.textContent = `${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m ${seconds}s`;
    span.style.color = (start - now) <= 300000 ? "red" : "#999";
  });
  setTimeout(updateCountdowns, 1000);
}

async function updateSeatsLeft() {
  const seatEls = document.querySelectorAll(".seat-info");
  for (const el of seatEls) {
    const tid = el.dataset.id;
    const total = parseInt(el.dataset.total);
    const snap = await getDocs(collection(db, "tournaments", tid, "players"));
    el.textContent = `Seats: ${snap.size}/${total}`;
  }
}

async function displayPlayersRightPanel(tournamentId) {
  const panel = document.getElementById("players-right-panel");
  const listEl = document.getElementById("players-list");
  const detailsEl = document.getElementById("player-details");
  const closeBtn = document.getElementById("players-close-btn");

  panel.classList.add("visible");
  closeBtn.onclick = () => panel.classList.remove("visible");

  listEl.innerHTML = "<li>Loading...</li>";
  detailsEl.innerHTML = "<p>Select a player to view details.</p>";

  const snap = await getDocs(collection(db, "tournaments", tournamentId, "players"));
  if (snap.empty) return listEl.innerHTML = "<li>No players joined.</li>";

  listEl.innerHTML = "";
  let count = 0;
  snap.forEach(doc => {
    const p = doc.data();
    const li = document.createElement("li");
    li.className = "player-list-item";
    li.innerHTML = `<button class="player-name" data-id="${doc.id}" data-ign="${p.ign || 'Unknown'}" data-email="${p.email || ''}" data-phone="${p.phone || ''}" data-uid="${p.gameUID || ''}">${p.ign || doc.id}</button>`;
    listEl.appendChild(li);
    count++;
  });

  document.getElementById("players-count").textContent = `Total Joined: ${count}`;

  listEl.querySelectorAll(".player-name").forEach(btn => {
    btn.addEventListener("click", () => {
      const ign = btn.dataset.ign;
      const email = btn.dataset.email;
      const uid = btn.dataset.id;
      const phone = btn.dataset.phone;
      const gameUID = btn.dataset.uid;

      detailsEl.innerHTML = `
        <h3>${ign}</h3>
        <p>UID: ${uid}</p>
        <p>Email: ${email}</p>
        <p>Phone: ${phone}</p>
        <p>Game UID: ${gameUID}</p>
        <button class='kick-player' data-uid='${uid}' data-tid='${tournamentId}'>❌ Kick Player</button>
      `;

      document.querySelector(".kick-player").onclick = async () => {
        if (confirm(`Remove ${ign}?`)) {
          await deleteDoc(doc(db, "tournaments", tournamentId, "players", uid));
          showMessage(`${ign} removed.`);
          displayPlayersRightPanel(tournamentId);
        }
      };
    });
  });
}

function showMessage(msg) {
  const modal = document.getElementById("message-modal");
  const content = document.getElementById("modal-message-text");
  content.innerHTML = msg;
  modal.classList.remove("hidden");
  document.getElementById("message-modal-close").onclick = () => modal.classList.add("hidden");
  modal.onclick = (e) => { if (e.target === modal) modal.classList.add("hidden"); };
}

let lastDeletedTournament = null;
function showDeleteModal(tid, title) {
  const modal = document.getElementById("delete-modal");
  const confirmBtn = document.getElementById("confirm-delete-btn");
  const cancelBtn = document.getElementById("cancel-delete-btn");
  const msg = document.getElementById("delete-modal-msg");

  msg.textContent = `Are you sure you want to delete '${title}'?`;
  modal.classList.remove("hidden");

  cancelBtn.onclick = () => modal.classList.add("hidden");
  confirmBtn.onclick = async () => {
    modal.classList.add("hidden");
    const ref = doc(db, "tournaments", tid);
    const snapshot = await getDoc(ref);
    if (snapshot.exists()) {
      lastDeletedTournament = { id: tid, data: snapshot.data() };
      await deleteDoc(ref);
      showMessage("❌ Tournament deleted. <button id='undo-delete-btn' class='undo-btn'>Undo</button>");
      loadTournaments();

      setTimeout(() => { lastDeletedTournament = null; }, 15000);

      setTimeout(() => {
        const undo = document.getElementById("undo-delete-btn");
        if (undo) undo.onclick = async () => {
          if (lastDeletedTournament) {
            await setDoc(doc(db, "tournaments", lastDeletedTournament.id), lastDeletedTournament.data);
            showMessage("✅ Deletion undone.");
            loadTournaments();
            lastDeletedTournament = null;
          }
        };
      }, 500);
    }
  };
}

function deleteTournament(tid) {
  const card = document.querySelector(`[data-id='${tid}']`)?.closest(".tournament-card");
  const title = card?.querySelector("strong")?.textContent || "this tournament";
  showDeleteModal(tid, title);
}

function editTournament(tid) {
  editingTournamentId = tid;
  getDoc(doc(db, "tournaments", tid)).then(docSnap => {
    if (!docSnap.exists()) return;
    const t = docSnap.data();

    tournamentForm.title.value = t.title;
    tournamentForm.category.value = t.category;
    categorySelect.dispatchEvent(new Event("change"));

    tournamentForm.matchType.value = t.matchType;
    tournamentForm.entryFee.value = t.entryFee;
    tournamentForm.prize.value = t.prize;
    tournamentForm.startTime.value = new Date(t.startTime).toISOString().slice(0, 16);
    tournamentForm.roomType.value = t.roomType || "";
    tournamentForm.roomId.value = t.roomId || "";
    tournamentForm.roomPassword.value = t.roomPassword || "";
    tournamentForm.gameUID.value = t.gameUID || "";
    tournamentForm.requireGameUID.checked = !!t.requireGameUID;
    tournamentForm.killPerPkr.value = t.killPerPkr || "";
    tournamentForm.status.value = t.status || "soon";

    if (t.category !== "cs") {
      tournamentForm.totalSeats.value = t.totalSeats;
    }
  });
}

window.editTournament = editTournament;
window.deleteTournament = deleteTournament;
