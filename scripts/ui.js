// === Toast Notification ===
export function showToast(message, type = "info") {
  // Prevent multiple toasts stacking
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.padding = "10px 20px";
  toast.style.borderRadius = "8px";
  toast.style.background = type === "error" ? "#ff4d4f" : type === "success" ? "#4caf50" : "#2196f3";
  toast.style.color = "white";
  toast.style.fontFamily = "'Orbitron', sans-serif";
  toast.style.fontSize = "14px";
  toast.style.zIndex = "9999";
  toast.style.animation = "fadeInOut 4s ease";

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// === Modal Control ===
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("hidden");
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("hidden");
}

// === Section Navigation ===
export function navigateTo(sectionId) {
  document.querySelectorAll("section").forEach((sec) => {
    sec.classList.add("hidden");
  });

  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.remove("hidden");
  }
}

// === Profile UI Update (used by firebase.js) ===
export function updateProfileUI(user, data) {
  const playerEmailSpan = document.getElementById("player-email");
  const playerNameSpan = document.getElementById("player-name");
  const playerUidSpan = document.getElementById("player-uid");
  const playerRegionSpan = document.getElementById("player-region");
  const playerPhoneSpan = document.getElementById("player-phone");
  const playerCoinsSpan = document.getElementById("player-coins");
  const topCoinSpan = document.getElementById("top-coin");
  const profilePicLarge = document.getElementById("profile-pic");

  if (!user || !data) {
    playerEmailSpan.textContent =
    playerNameSpan.textContent =
    playerUidSpan.textContent =
    playerRegionSpan.textContent =
    playerPhoneSpan.textContent = "N/A";

    playerCoinsSpan.textContent = "0";
    topCoinSpan.textContent = "0";
    profilePicLarge.src = "https://via.placeholder.com/120";
    return;
  }

  playerEmailSpan.textContent = user.email || "N/A";
  playerNameSpan.textContent = data.ign || user.displayName || "N/A";
  playerUidSpan.textContent = data.ffUid || "N/A";
  playerRegionSpan.textContent = data.region || "N/A";
  playerPhoneSpan.textContent = data.pkPhoneNumber || "N/A";
  playerCoinsSpan.textContent = data.coins ?? 0;
  topCoinSpan.textContent = data.coins ?? 0;
  profilePicLarge.src = user.photoURL || "https://via.placeholder.com/120";
}
 