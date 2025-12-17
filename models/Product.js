import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  imageUrl: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    required: true,
    enum: ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'white', 'black', 'multicolor'],
    default: 'multicolor'
  },
  stockCount: {
    type: Number,
    default: 100,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual for inStock status
productSchema.virtual('inStock').get(function() {
  return this.stockCount > 0;
});

// Ensure virtuals are included in JSON
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

// Text index for search
productSchema.index({ name: 'text', description: 'text' });

// Static method to search products
productSchema.statics.search = async function(query, colorFilter) {
  let filter = {};
  
  if (colorFilter && colorFilter !== 'all') {
    filter.color = colorFilter;
  }
  
  if (!query || query.trim() === '') {
    return this.find(filter).sort({ createdAt: -1 });
  }
  
  const regex = new RegExp(query, 'i');
  return this.find({
    ...filter,
    $or: [
      { name: regex },
      { description: regex }
    ]
  }).sort({ createdAt: -1 });
};

const Product = mongoose.model('Product', productSchema);

export default Product;
