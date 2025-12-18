import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['user', 'assistant', 'system']
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const conversationSchema = new mongoose.Schema({
  userId: {
    type: String,  // String to support both ObjectId strings and guest IDs like "guest_123..."
    required: true,
    index: true
  },
  messages: [messageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
conversationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get or create conversation for a user
conversationSchema.statics.getOrCreate = async function(userId) {
  let conversation = await this.findOne({ userId });
  if (!conversation) {
    conversation = new this({
      userId,
      messages: [{
        role: 'system',
        content: 'You are a helpful marble shopping assistant for Lbinag. Help customers find the perfect marbles, answer questions about our products, and assist with their shopping experience. Be friendly, knowledgeable about marbles, and always try to help customers find what they need. We sell marbles in different colors: red, blue, green, yellow, orange, purple, pink, white, black, and multicolor. Prices are in Moroccan Dirham (Dh).'
      }]
    });
    await conversation.save();
  }
  return conversation;
};

// Instance method to add a message
conversationSchema.methods.addMessage = async function(role, content) {
  this.messages.push({ role, content, timestamp: new Date() });
  await this.save();
  return this.messages[this.messages.length - 1];
};

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;

