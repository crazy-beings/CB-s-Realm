import { initRouter } from "./router.js";
import { fetchAllTournaments, db, doc, getDoc, auth } from "./firebase.js";
import { openModal, closeModal } from "./ui.js";

let allTournaments = [];
let selectedCategory = "all";
let selectedMatchType = "all";
let joinedTournaments = new Set();

// DOM references
let tournamentList, noTournamentsMessage;
let categoryTabs, subfilterTabs;
let joinTournamentIdInput, joinTournamentName, joinTournamentTime;
let cancelBtn;

window.addEventListener("DOMContentLoaded", async () => {
  initRouter();

  // Elements
  tournamentList = document.getElementById("tournament-list");
  noTournamentsMessage = document.getElementById("no-tournaments-message");
  categoryTabs = document.querySelectorAll(".category-tab");
  subfilterTabs = document.querySelectorAll(".subfilter-tab");

  joinTournamentIdInput = document.getElementById("join-tournament-id");
  joinTournamentName = document.getElementById("join-tournament-name");
  joinTournamentTime = document.getElementById("join-tournament-time");
  cancelBtn = document.getElementById("cancel-join-btn");

  cancelBtn?.addEventListener("click", () => closeModal("join-tournament-modal"));

  // Load everything
  allTournaments = await fetchAllTournaments();
  await cacheJoinedTournaments();
  renderTournaments(allTournaments);
  setupFilters();
});

// Cache joined tournaments for current user
async function cacheJoinedTournaments() {
  joinedTournaments.clear();
  const user = auth.currentUser;
  if (!user) return;

  const uid = user.uid;
  const promises = allTournaments.map(async (t) => {
    const playerRef = doc(db, "tournaments", t.id, "players", uid);
    const playerSnap = await getDoc(playerRef);
    if (playerSnap.exists()) joinedTournaments.add(t.id);
  });

  await Promise.all(promises);
}

function renderTournaments(tournaments) {
  tournamentList.innerHTML = "";

  if (!tournaments.length) {
    noTournamentsMessage.classList.remove("hidden");
    return;
  }
  noTournamentsMessage.classList.add("hidden");

  tournaments.forEach((t) => {
    const isJoined = joinedTournaments.has(t.id);
    const card = document.createElement("div");
    card.className = "tournament-card";

    const joinBtnHTML = isJoined
      ? `<button class="join-button joined" disabled>✅ Joined</button>`
      : `<button class="join-button" id="join-btn-${t.id}" onclick="openJoinModal('${t.id}', '${t.title}', '${t.startTime}')">Join</button>`;

    card.innerHTML = `
      <div class="card-header">
        <span class="tournament-title">${t.title}</span>
        <span class="status-badge ${getStatusClass(t.startTime)}">${getStatusText(t.startTime)}</span>
      </div>
      <img src="${t.imageURL || 'https://placehold.co/300x180/png'}" alt="Tournament Banner">
      <div class="tournament-meta">🕒 ${new Date(t.startTime).toLocaleString()}</div>
      <div class="tournament-meta">🎮 ${t.category.toUpperCase()} - ${t.matchType}</div>
      <div class="tournament-meta">💰 Prize: ${t.prize} | Entry: ${t.entryFee > 0 ? t.entryFee + ' Coins' : 'Free'}</div>
      ${joinBtnHTML}
    `;

    tournamentList.appendChild(card);
  });
}

function getStatusClass(startTime) {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  if (start - now > 1800000) return "status-soon";
  if (start - now > 0) return "status-now";
  return "status-ongoing";
}

function getStatusText(startTime) {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  if (start - now > 1800000) return "Soon";
  if (start - now > 0) return "Now";
  return "Playing";
}

function setupFilters() {
  categoryTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      categoryTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      selectedCategory = tab.dataset.filter;

      const subfilters = document.querySelector(".tournament-subfilters");
      subfilters.classList.toggle("hidden", selectedCategory === "all");

      applyFilters();
    });
  });

  subfilterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      subfilterTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      selectedMatchType = tab.dataset.filter;
      applyFilters();
    });
  });
}

function applyFilters() {
  const filtered = allTournaments.filter((t) => {
    const matchCat = selectedCategory === "all" || t.category === selectedCategory;
    const matchType = selectedMatchType === "all" || t.matchType === selectedMatchType;
    return matchCat && matchType;
  });

  renderTournaments(filtered);
}

window.openJoinModal = function (id, title, startTime) {
  if (joinedTournaments.has(id)) return; // prevent opening modal if already joined

  joinTournamentIdInput.value = id;
  joinTournamentName.textContent = `Are you sure you want to join "${title}"?`;
  joinTournamentTime.textContent = new Date(startTime).toLocaleString();
  openModal("join-tournament-modal");
};

window.closeJoinModal = function () {
  closeModal("join-tournament-modal");
};

window.loadTournaments = async function () {
  allTournaments = await fetchAllTournaments();
  await cacheJoinedTournaments();
  applyFilters();
};
