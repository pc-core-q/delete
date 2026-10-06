import { getApps, initializeApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";
import { getFirebaseConfig } from "./firebase.functions";

let dbPromise: Promise<Database> | null = null;

/** Lazily initializes Firebase (fetching the config from the server) and returns the Realtime Database instance. */
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = getFirebaseConfig().then((config) => {
      const app = getApps().length ? getApps()[0] : initializeApp(config);
      return getDatabase(app);
    });
  }
  return dbPromise;
}
