import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';

const UserSchema =
  mongoose.models.User ||
  mongoose.model(
    'User',
    new mongoose.Schema(
      {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, index: true },
        passwordHash: { type: String, required: true },
      },
      { timestamps: true }
    )
  );

export async function getUserModel() {
  await connectToDatabase();
  return UserSchema;
}

