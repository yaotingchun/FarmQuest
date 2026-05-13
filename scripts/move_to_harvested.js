const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const absoluteCredPath = path.resolve(__dirname, '..', credPath);

initializeApp({
  credential: cert(absoluteCredPath),
});

const db = getFirestore('farmquest');
db.settings({ ignoreUndefinedProperties: true });

async function moveToHarvested() {
  const ordersRef = db.collection('marketplace_orders');
  const snapshot = await ordersRef.get();
  
  if (snapshot.empty) {
    console.log('No orders found.');
    return;
  }

  // Find the first non-completed order
  const orderDoc = snapshot.docs.find(d => d.data().status !== 'completed');
  
  if (!orderDoc) {
    console.log('No active orders found.');
    return;
  }

  console.log(`Updating order ${orderDoc.id} (${orderDoc.data().plant_name}) to harvested...`);
  
  const now = new Date().toISOString();
  const history = orderDoc.data().status_history || [];
  
  await orderDoc.ref.update({
    status: 'harvested',
    status_history: [
      ...history,
      { status: 'harvested', timestamp: now }
    ]
  });

  console.log('Done!');
}

moveToHarvested().catch(console.error);
