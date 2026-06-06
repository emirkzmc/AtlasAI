import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);

// Ayrı storage projesi (VITE_STORAGE_...) bilgileri varsa özel bir instance oluşturur,
// yoksa default app üzerinden devam eder.
const storageConfig = {
  apiKey: import.meta.env.VITE_STORAGE_API_KEY,
  authDomain: import.meta.env.VITE_STORAGE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_STORAGE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_STORAGE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_STORAGE_APP_ID,
  measurementId: import.meta.env.VITE_STORAGE_MEASUREMENT_ID,
};

export const storageApp = import.meta.env.VITE_STORAGE_API_KEY 
  ? initializeApp(storageConfig, "storageApp") 
  : app;

// Initialize Analytics safely – only in environments that support it.
// isSupported() prevents crashes in non-browser or extension contexts.
if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        getAnalytics(app);
      }
    })
    .catch(() => {
      // Analytics init failed silently – app continues normally.
    });
}
