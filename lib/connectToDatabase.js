import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {};

let cachedClient = null;
let cachedDb = null;

if (!uri) {
    throw new Error("Please add your Mongo URI to .env");
}

export async function connectToDatabase() {
    try {
        if (cachedClient && cachedDb) {
            return { db: cachedDb };
        }

        const client = await new MongoClient(uri, options).connect();
        const db = client.db("test"); // Replace with your database name
        
        cachedClient = client;
        cachedDb = db;

        console.log("Successfully connected to MongoDB");
        return { db };
    } catch (e) {
        console.error("MongoDB connection error:", e);
        throw e; // Propagate the error
    }
}