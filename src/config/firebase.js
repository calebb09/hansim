// config/firebase.js
import admin from "firebase-admin";
import config from "./index.js";

try {
  if (!admin.apps.length) {
    console.log(
      "Initializing Firebase with credential:",
      config.firebase.credential.project_id,
    ); // Debug
    admin.initializeApp({
      credential: admin.credential.cert(config.firebase.credential),
    });
    console.log("Firebase Admin Initialized");
  }
} catch (error) {
  console.error("Firebase Initialization Error:", error.message, error.stack);
  throw error;
}

export default admin;
