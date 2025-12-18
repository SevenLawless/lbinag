import mongoose from 'mongoose';

const magicLinkSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  used: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// TTL index - automatically delete expired tokens after 1 hour past expiry
magicLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

// Note: token already has unique: true which creates an index

const MagicLink = mongoose.model('MagicLink', magicLinkSchema);

export default MagicLink;

