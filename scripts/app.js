// app.js

import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "./firebase.js";
import { showToast } from "./ui.js";

// === DOM References ===
const joinTournamentIdInput = document.getElementById("join-tournament-id");
const confirmBtn = document.getElementById("confirm-join-btn");
const cancelBtn = document.getElementById("cancel-join-btn");

let joinInProgress = false;

confirmBtn?.addEventListener("click", async () => {
  if (joinInProgress) return;
  joinInProgress = true;

  const user = auth.currentUser;
  if (!user) {
    showToast("Please login to join", "error");
    joinInProgress = false;
    return;
  }

  const tid = joinTournamentIdInput.value;
  const playerRef = doc(db, "tournaments", tid, "players", user.uid);
  const tournamentRef = doc(db, "tournaments", tid);

  try {
    const tournamentSnap = await getDoc(tournamentRef);
    const tournament = tournamentSnap.data();

    if (!tournament) {
      showToast("Tournament not found", "error");
      return;
    }

    if (Date.now() >= new Date(tournament.startTime).getTime()) {
      showToast("Tournament started", "error");
      return;
    }

    if (tournament.seatsLeft <= 0) {
      showToast("Tournament full", "error");
      return;
    }

    const alreadyJoined = await getDoc(playerRef);
    if (alreadyJoined.exists()) {
      showToast("You're already in, warrior 💥", "info");
      window.closeJoinModal?.();
      return;
    }

    const userSnap = await getDoc(doc(db, "users", user.uid));
    const userData = userSnap.data();

    if (tournament.entryFee > 0 && userData.coins < tournament.entryFee) {
      showToast("Not enough coins 🪙", "error");
      return;
    }

    // Deduct coins
    if (tournament.entryFee > 0) {
      await updateDoc(doc(db, "users", user.uid), {
        coins: userData.coins - tournament.entryFee
      });
    }

    // Add player to players subcollection
    await setDoc(playerRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      joinedAt: new Date().toISOString(),
      ffUid: userData.ffUid || "",
      ign: userData.ign || "",
      region: userData.region || "",
      phone: userData.pkPhoneNumber || "",
      entryFeePaid: tournament.entryFee || 0
    });

    // Decrease seatsLeft
    await updateDoc(tournamentRef, {
      seatsLeft: tournament.seatsLeft - 1
    });

    showToast("🔥 You joined the battle .", "success");
    window.closeJoinModal?.();

    // Disable the Join button
    const btn = document.querySelector(`#join-btn-${tid}`);
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Joined";
      btn.classList.add("joined");

      const successIcon = document.createElement("span");
      successIcon.textContent = "✅";
      successIcon.classList.add("join-success-icon");
      btn.parentElement.appendChild(successIcon);

      setTimeout(() => successIcon.remove(), 2000);
    }
const card = btn.closest(".tournament-card");
if (card) {
  card.classList.add("animate-join");
  setTimeout(() => card.classList.remove("animate-join"), 1000);
}

    // Reload tournament list if function exists
    if (typeof window.loadTournaments === "function") {
      await window.loadTournaments();
    }

  } catch (err) {
    console.error("Join error:", err);
    showToast("You joined, but something went wrong in refreshing the list.", "warning");
  } finally {
    joinInProgress = false;
  }
});

// Cancel modal button
cancelBtn?.addEventListener("click", () => {
  window.closeJoinModal?.();
});
