import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();
const url = process.env.DATABASE_URL;
console.log('URI:', url);
if (!url) {
  console.error('DATABASE_URL not defined');
  process.exit(1);
}
const client = new MongoClient(url);
try {
  await client.connect();
  const db = client.db();
  const admin = db.admin();
  const dbs = await admin.listDatabases();
  console.log('databases:', dbs.databases.map(d => d.name));
  console.log('current db:', db.databaseName);
  const cols = await db.listCollections().toArray();
  console.log('collections:', cols.map(c => c.name));
  if (cols.some(c => c.name === 'users')) {
    console.log('users count:', await db.collection('users').countDocuments());
    console.log('one user:', await db.collection('users').findOne({}));
  }
} catch (err) {
  console.error(err);
} finally {
  await client.close();
}
