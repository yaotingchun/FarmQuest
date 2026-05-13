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

async function recalculateEarnings() {
  console.log('--- Recalculating Farmer Earnings ---');
  
  const ordersSnapshot = await db.collection('marketplace_orders')
    .where('status', '==', 'completed')
    .get();

  if (ordersSnapshot.empty) {
    console.log('No completed orders found.');
    return;
  }

  const farmerStats = {};

  ordersSnapshot.docs.forEach(doc => {
    const order = doc.data();
    console.log(`Processing Order ${doc.id} - Farmer: ${order.farmer_uid}`);
    if (order.farmer_uid) {
      const uid = order.farmer_uid;
      const payout = order.farmer_payout_rm || (order.reward_rm * 0.95);
      
      if (!farmerStats[uid]) {
        farmerStats[uid] = { earnings: 0, count: 0 };
      }
      
      farmerStats[uid].earnings += payout;
      farmerStats[uid].count += 1;
    }
  });

  console.log(`Found ${Object.keys(farmerStats).length} farmers to update.`);

  for (const uid of Object.keys(farmerStats)) {
    const stats = farmerStats[uid];
    console.log(`Updating Farmer ${uid}: RM ${stats.earnings.toFixed(2)} (${stats.count} orders)`);
    
    await db.collection('users').doc(uid).set({
      total_earnings: stats.earnings,
      completed_orders: stats.count
    }, { merge: true });
  }

  console.log('Migration complete!');
}

recalculateEarnings().catch(console.error);
