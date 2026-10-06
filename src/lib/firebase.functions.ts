import { createServerFn } from "@tanstack/react-start";

/** Returns the public Firebase web config; the API key stays server-side. */
export const getFirebaseConfig = createServerFn({ method: "GET" }).handler(async () => ({
  apiKey: process.env["GOOGLE_API_KEY"]!,
  authDomain: "revew-f8136.firebaseapp.com",
  databaseURL: "https://revew-f8136-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "revew-f8136",
  storageBucket: "revew-f8136.firebasestorage.app",
  messagingSenderId: "775725909156",
  appId: "1:775725909156:web:952c856e306b94ac84d231",
}));
