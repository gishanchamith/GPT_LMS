import mongoose from 'mongoose';

export async function connectDB(uri: string | undefined): Promise<void> {
  if (!uri) throw new Error('MONGODB_URI is not set');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('MongoDB connected');
}
