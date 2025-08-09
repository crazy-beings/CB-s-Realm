// scripts/firebase-config.js
const firebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : {
      apiKey: "AIzaSyANnYb-9NynQhUehVVRT9CjZ6gu6Dc91fg",
      authDomain: "battlezone-5b0b6.firebaseapp.com",
      projectId: "battlezone-5b0b6",
      storageBucket: "battlezone-5b0b6.appspot.com",
      messagingSenderId: "1038199514799",
      appId: "1:1038199514799:web:eee640a2b1877ce7df565a",
      measurementId: "G-C37ETLZN4Z"
    };

export default firebaseConfig; // ✅ use default export
