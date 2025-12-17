import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for fast email lookups
userSchema.index({ email: 1 });

const User = mongoose.model('User', userSchema);

export default User;

