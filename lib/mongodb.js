import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI;

let cachedClient = null;

export async function connectToDatabase() {
  if (cachedClient) return { db: cachedClient.db('portfolio') };

  try {
    const client = new MongoClient(uri);
    await client.connect();
    cachedClient = client;
    return { db: client.db('portfolio') };
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    throw error;
  }
}