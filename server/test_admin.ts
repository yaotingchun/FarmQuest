import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path.isAbsolute(credPath)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(
      __dirname,
      "..",
      credPath
    );
  }
}

import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const db = getFirestore('farmquest');

async function checkDatabase() {
  try {
    const ordersSnap = await db.collection('marketplace_orders').get();
    console.log(`Marketplace Orders Count: ${ordersSnap.size}`);
    ordersSnap.docs.slice(0, 3).forEach(doc => {
      console.log(`- ID: ${doc.id}, Plant: ${doc.data().plant_name}, Status: ${doc.data().status}`);
    });
  } catch (err) {
    console.error("Error checking database:", err);
  }
}

checkDatabase();
