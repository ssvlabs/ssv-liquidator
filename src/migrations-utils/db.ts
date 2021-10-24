import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

export const getDb = async () => {
  const client: any = await MongoClient.connect(process.env.MONGO_DB, { useUnifiedTopology: true });
  return client.db();
};