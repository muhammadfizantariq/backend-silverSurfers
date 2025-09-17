import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      // index will be created by the unique constraint
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    provider: { type: String, enum: ['local', 'google'], default: 'local' },
    verified: { type: Boolean, default: true },
    // Optional fields for future email verification & password reset
    verificationTokenHash: { type: String },
    verificationExpires: { type: Date },
    resetTokenHash: { type: String },
    resetExpires: { type: Date },
    googleId: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('User', UserSchema);
