// script/fcm.js
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./firebase.js"; // Import auth and db from firebase.js

const messaging = getMessaging();

// Function to display a custom modal message instead of alert()
function showMessageModal(message) {
  const modal = document.getElementById('message-modal');
  const messageText = document.getElementById('modal-message-text');
  const closeButton = document.getElementById('message-modal-close');

  if (modal && messageText) {
    messageText.textContent = message;
    modal.classList.remove('hidden');

    const closeHandler = () => {
      modal.classList.add('hidden');
      closeButton.removeEventListener('click', closeHandler);
      modal.removeEventListener('click', outsideClickHandler);
    };

    const outsideClickHandler = (event) => {
      if (event.target === modal) {
        closeHandler();
      }
    };

    closeButton.addEventListener('click', closeHandler);
    modal.addEventListener('click', outsideClickHandler);
  } else {
    console.error("Message modal elements not found.");
    // Fallback to console log if modal elements are missing
    console.log("Message (fallback):", message);
  }
}

export async function requestNotificationPermission() {
  try {
    // Request permission for notifications from the user.
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.warn("Notifications not allowed by user.");
      showMessageModal("Notification permission denied. You won't receive tournament start alerts.");
      return;
    }

    // VAPID key is essential for web push notifications.
    // Replace "YOUR_VAPID_KEY_HERE" with your actual Firebase project's VAPID key.
    // You can find this in Firebase Console -> Project settings -> Cloud Messaging -> Web configuration.
    const vapidKey = "YOUR_VAPID_KEY_HERE"; // IMPORTANT: Replace with your actual VAPID key

    // Get the FCM registration token for the current device.
    const token = await getToken(messaging, { vapidKey });

    const user = auth.currentUser;
    // Save the FCM token to the user's document in Firestore if user is logged in.
    if (user && token) {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { fcmToken: token }, { merge: true });
      console.log("✅ FCM Token saved:", token);
    } else {
      console.warn("User not logged in or FCM token not available. Cannot save token.");
    }
  } catch (err) {
    console.error("❌ Failed to get FCM token or save it:", err);
    showMessageModal("Failed to enable notifications. Please check console for details.");
  }
}

// Handle foreground messages (when the app is open and in focus).
onMessage(messaging, (payload) => {
  console.log("📬 Foreground message received:", payload);
  // Display a notification for foreground messages using the Web Notification API.
  const notificationTitle = payload.notification?.title || "New Notification";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: payload.notification?.icon || "/icon.png", // Default icon if not provided in payload
    data: payload.data // Pass custom data
  };

  // Create and show the notification.
  new Notification(notificationTitle, notificationOptions);
});
