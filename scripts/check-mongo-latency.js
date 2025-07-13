// save as check-mongo-latency.js
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb+srv://niitsocialhub:niitsocialhub%402025@cluster0.5m149pf.mongodb.net/gisthub?retryWrites=true&w=majority&appName=Cluster0';
const dbName = 'gisthub';

async function main() {
  const start = Date.now();
  const client = new MongoClient(uri, { useUnifiedTopology: true });
  await client.connect();
  const connectTime = Date.now();
  console.log('Connected in', connectTime - start, 'ms');

  const db = client.db(dbName);
  const users = db.collection('users');
  const t0 = Date.now();
  await users.findOne(); // simple query
  const t1 = Date.now();
  console.log('Simple findOne query took', t1 - t0, 'ms');

  await client.close();
}

main().catch(console.error);
  const users = db.collection('users');
  const t0 = Date.now();
  await users.findOne(); // simple query
  const t1 = Date.now();
  console.log('Simple findOne query took', t1 - t0, 'ms');

  await client.close();
}

main().catch(console.error);