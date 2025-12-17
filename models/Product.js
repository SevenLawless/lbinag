import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  imageUrl: {
    type: String,
    default: '/logo.png'
  },
  color: {
    type: String,
    required: true,
    enum: ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'white', 'black', 'multicolor']
  },
  inStock: {
    type: Boolean,
    default: true
  },
  stockCount: {
    type: Number,
    default: 100
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Text index for search functionality
productSchema.index({ name: 'text', description: 'text', color: 'text' });

// Static method to search products
productSchema.statics.search = async function(query, colorFilter) {
  let filter = {};
  
  // Add color filter if specified
  if (colorFilter && colorFilter !== 'all') {
    filter.color = colorFilter;
  }
  
  if (!query || query.trim() === '') {
    return this.find(filter).sort({ createdAt: -1 });
  }
  
  // Try text search first
  const textFilter = { ...filter, $text: { $search: query } };
  const textResults = await this.find(
    textFilter,
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });
  
  if (textResults.length > 0) {
    return textResults;
  }
  
  // Fallback to regex search if no text results
  const regex = new RegExp(query, 'i');
  return this.find({
    ...filter,
    $or: [
      { name: regex },
      { description: regex },
      { color: regex }
    ]
  }).sort({ createdAt: -1 });
};

const Product = mongoose.model('Product', productSchema);

export default Product;
