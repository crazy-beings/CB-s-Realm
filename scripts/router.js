// router.js
import { navigateTo } from "./ui.js";

export function initRouter() {
  window.navigateTo = navigateTo;

  // Navigation buttons with data-nav attribute
  document.querySelectorAll("[data-nav]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-nav");
      if (target) {
        navigateTo(target);
      }
    });
  });

  // Top bar click behavior
  const coinBalance = document.getElementById("coin-balance");
  const userPic = document.getElementById("user-pic");

  coinBalance?.addEventListener("click", () => {
    navigateTo("coin-wallet-section");
  });

  userPic?.addEventListener("click", () => {
    navigateTo("profile-section");
  });
}
