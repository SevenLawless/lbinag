import { Router } from 'express';
import Product from '../models/Product.js';

const router = Router();

// Available colors for filter
const COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'white', 'black', 'multicolor'];

/**
 * GET /catalog
 * Display product catalog with optional search and color filter
 * Search uses query params: /catalog?q=blue&color=red
 */
router.get('/', async (req, res) => {
  try {
    const searchQuery = req.query.q || '';
    const selectedColor = req.query.color || '';
    
    console.log(`[Catalog] Searching for: "${searchQuery || 'all products'}", color: "${selectedColor || 'all'}"`);
    
    // Use the Product.search static method
    const products = await Product.search(searchQuery, selectedColor);
    
    res.render('catalog', {
      title: searchQuery ? `Search: ${searchQuery} - Lbinag` : 'Catalog - Lbinag',
      products,
      searchQuery,
      selectedColor,
      colors: COLORS,
      resultCount: products.length,
      hasResults: products.length > 0
    });
    
  } catch (error) {
    console.error('[Catalog] Error:', error);
    res.render('error', {
      title: 'Error - Lbinag',
      message: 'Failed to load catalog',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

/**
 * GET /catalog/color/:color
 * Filter products by color
 */
router.get('/color/:color', async (req, res) => {
  try {
    const { color } = req.params;
    
    const products = await Product.find({ 
      color: color.toLowerCase()
    }).sort({ createdAt: -1 });
    
    res.render('catalog', {
      title: `${color.charAt(0).toUpperCase() + color.slice(1)} Marbles - Lbinag`,
      products,
      searchQuery: '',
      selectedColor: color,
      colors: COLORS,
      resultCount: products.length,
      hasResults: products.length > 0
    });
    
  } catch (error) {
    console.error('[Catalog] Color error:', error);
    res.render('error', {
      title: 'Error - Lbinag',
      message: 'Failed to load color filter'
    });
  }
});

/**
 * GET /catalog/:id
 * Display single product details
 */
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).render('error', {
        title: 'Not Found - Lbinag',
        message: 'Product not found'
      });
    }
    
    // Get related products (same color, excluding current)
    const relatedProducts = await Product.find({
      color: product.color,
      _id: { $ne: product._id }
    }).limit(4);
    
    res.render('product', {
      title: `${product.name} - Lbinag`,
      product,
      relatedProducts,
      hasRelated: relatedProducts.length > 0
    });
    
  } catch (error) {
    console.error('[Catalog] Product error:', error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(404).render('error', {
        title: 'Not Found - Lbinag',
        message: 'Product not found'
      });
    }
    
    res.render('error', {
      title: 'Error - Lbinag',
      message: 'Failed to load product'
    });
  }
});

export default router;
