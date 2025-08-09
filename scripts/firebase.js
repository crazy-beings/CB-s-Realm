// firebase.js

// --- Firebase Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- Firebase Config ---
import firebaseConfig from "./firebase-config.js";

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// --- DOM Elements ---
const loginBtn = document.getElementById("google-login");
const logoutBtn = document.getElementById("logout-btn");
const userPic = document.getElementById("user-pic");
const playerEmailSpan = document.getElementById("player-email");
const playerNameSpan = document.getElementById("player-name");
const playerUidSpan = document.getElementById("player-uid");
const playerRegionSpan = document.getElementById("player-region");
const playerPhoneSpan = document.getElementById("player-phone");
const playerCoinsSpan = document.getElementById("player-coins");
const topCoinSpan = document.getElementById("top-coin");
const profilePicLarge = document.getElementById("profile-pic");
const adminPanelLink = document.getElementById("admin-panel-link");
const userInfoModal = document.getElementById("user-info-modal");
const ffUidInput = document.getElementById("ff-uid");
const ignInput = document.getElementById("ign");
const regionSelect = document.getElementById("region");
const pkPhoneNumberInput = document.getElementById("pk-phone-number");
const userInfoForm = document.getElementById("user-info-form");
const toast = document.getElementById("toast");

// --- Global State ---
let currentUserData = null;

function showToast(msg, type = "success") {
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3000);
}

// --- Login ---
loginBtn?.addEventListener("click", () => {
  signInWithPopup(auth, provider).catch((err) => {
    console.error("Login Error:", err);
    showToast("Login failed", "error");
  });
});

logoutBtn?.addEventListener("click", () => {
  signOut(auth)
    .then(() => {
      showToast("Logged out");
      window.navigateTo("home-section");
    })
    .catch((err) => {
      console.error("Logout Error:", err);
      showToast("Logout failed", "error");
    });
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    loginBtn?.classList.remove("hidden");
    logoutBtn?.classList.add("hidden");
    userPic?.classList.add("hidden");
    adminPanelLink?.classList.add("hidden");
    updateProfileUI(null);
    return;
  }

  loginBtn?.classList.add("hidden");
  logoutBtn?.classList.remove("hidden");
  userPic?.classList.remove("hidden");
  userPic.src = user.photoURL || "https://via.placeholder.com/38";
  userPic.alt = user.displayName;

  const adminSnap = await getDoc(doc(db, "admins", user.uid));
  if (adminSnap.exists()) adminPanelLink?.classList.remove("hidden");

  const userRef = doc(db, "users", user.uid);
  let userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    const newUser = {
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      coins: 0,
      ffUid: "",
      ign: "",
      region: "",
      pkPhoneNumber: "",
      createdAt: new Date().toISOString()
    };
    await setDoc(userRef, newUser);
    currentUserData = newUser;
  } else {
    currentUserData = userSnap.data();
  }

  updateProfileUI(user, currentUserData);

  if (!currentUserData.ffUid || !currentUserData.ign) {
    ffUidInput.value = currentUserData.ffUid || "";
    ignInput.value = currentUserData.ign || "";
    regionSelect.value = currentUserData.region || "";
    pkPhoneNumberInput.value = currentUserData.pkPhoneNumber || "";
    userInfoModal.classList.remove("hidden");
  }
});

function updateProfileUI(user, data) {
  if (!user || !data) {
    playerEmailSpan.textContent = playerUidSpan.textContent =
    playerNameSpan.textContent = playerRegionSpan.textContent =
    playerPhoneSpan.textContent = playerCoinsSpan.textContent = "N/A";
    profilePicLarge.src = "https://via.placeholder.com/120";
    topCoinSpan.textContent = "0";
    return;
  }

  playerEmailSpan.textContent = user.email || "N/A";
  playerUidSpan.textContent = data.ffUid || "N/A";
  playerNameSpan.textContent = data.ign || user.displayName || "N/A";
  playerRegionSpan.textContent = data.region || "N/A";
  playerPhoneSpan.textContent = data.pkPhoneNumber || "N/A";
  playerCoinsSpan.textContent = data.coins ?? 0;
  profilePicLarge.src = user.photoURL || "https://via.placeholder.com/120";
  topCoinSpan.textContent = data.coins ?? 0;
}

userInfoForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const ffUid = ffUidInput.value.trim();
  const ign = ignInput.value.trim();
  const region = regionSelect.value;
  const phone = pkPhoneNumberInput.value.trim();

  if (!ffUid || !ign) return showToast("FF UID and IGN required", "error");

  const q = query(collection(db, "users"), where("ffUid", "==", ffUid));
  const exists = await getDocs(q);
  if (!exists.empty && exists.docs[0].id !== auth.currentUser.uid) {
    showToast("FF UID already registered", "error");
    return;
  }

  const user = auth.currentUser;
  const userRef = doc(db, "users", user.uid);
  await setDoc(
    userRef,
    {
      ffUid,
      ign,
      region,
      pkPhoneNumber: phone,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );

  currentUserData = { ...currentUserData, ffUid, ign, region, pkPhoneNumber: phone };
  userInfoModal.classList.add("hidden");
  updateProfileUI(user, currentUserData);
  showToast("Profile updated");
});

export async function fetchAllTournaments() {
  try {
    const snap = await getDocs(query(collection(db, "tournaments"), orderBy("startTime")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Fetch tournaments error:", err);
    showToast("Failed to load tournaments", "error");
    return [];
  }
}

export {
  auth,
  db,
  provider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp
};