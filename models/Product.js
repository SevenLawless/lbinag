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
  inStock: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Text index for search
productSchema.index({ name: 'text', description: 'text' });

// Pre-save middleware to sync inStock with stockCount
productSchema.pre('save', function(next) {
  this.inStock = this.stockCount > 0;
  next();
});

// Static method to search products - returns plain objects for Handlebars
productSchema.statics.search = async function(query, colorFilter) {
  let filter = {};
  
  if (colorFilter && colorFilter !== 'all') {
    filter.color = colorFilter;
  }
  
  let products;
  
  if (!query || query.trim() === '') {
    products = await this.find(filter).sort({ createdAt: -1 }).lean();
  } else {
    const regex = new RegExp(query, 'i');
    products = await this.find({
      ...filter,
      $or: [
        { name: regex },
        { description: regex }
      ]
    }).sort({ createdAt: -1 }).lean();
  }
  
  // Add computed inStock for plain objects
  products = products.map(p => ({
    ...p,
    inStock: p.stockCount > 0
  }));
  
  console.log('[Product.search] Found', products.length, 'products');
  return products;
};

const Product = mongoose.model('Product', productSchema);

export default Product;
