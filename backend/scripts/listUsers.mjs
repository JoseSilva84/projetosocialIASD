import "../src/config/env.js";
import { MongoClient } from "mongodb";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not defined");
  process.exit(1);
}
const client = new MongoClient(url);
try {
  await client.connect();
  const db = client.db("Users");
  const users = await db.collection("users").find({}, { projection: { name: 1, role: 1 } }).toArray();
  console.log("users:", users);
} catch (err) {
  console.error(err);
} finally {
  await client.close();
}
