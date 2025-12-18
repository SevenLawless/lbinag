import { Router } from 'express';
import Product from '../models/Product.js';

const router = Router();

// Available colors for filter
const COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'white', 'black', 'multicolor'];

/**
 * GET /catalog
 * Display product catalog with optional search and color filter
 */
router.get('/', async (req, res) => {
  try {
    const searchQuery = req.query.q || '';
    const selectedColor = req.query.color || '';
    
    console.log('[Catalog] Search:', searchQuery || 'none', '| Color:', selectedColor || 'all');
    
    const products = await Product.search(searchQuery, selectedColor);
    
    console.log('[Catalog] Rendering with', products.length, 'products');
    
    res.render('catalog', {
      title: searchQuery ? `Search: ${searchQuery}` : 'Catalog',
      products,
      searchQuery,
      selectedColor,
      colors: COLORS,
      resultCount: products.length
    });
  } catch (error) {
    console.error('[Catalog] Error:', error);
    res.render('catalog', {
      title: 'Catalog',
      products: [],
      searchQuery: '',
      selectedColor: '',
      colors: COLORS,
      resultCount: 0,
      error: 'Failed to load products'
    });
  }
});

/**
 * GET /catalog/color/:color
 * Filter products by color
 */
router.get('/color/:color', async (req, res) => {
  try {
    const color = req.params.color.toLowerCase();
    
    // Use .lean() to get plain objects for Handlebars
    let products = await Product.find({ color }).sort({ createdAt: -1 }).lean();
    
    // Add computed inStock
    products = products.map(p => ({
      ...p,
      inStock: p.stockCount > 0
    }));
    
    res.render('catalog', {
      title: `${color.charAt(0).toUpperCase() + color.slice(1)} Marbles`,
      products,
      searchQuery: '',
      selectedColor: color,
      colors: COLORS,
      resultCount: products.length
    });
  } catch (error) {
    console.error('[Catalog] Color filter error:', error);
    res.redirect('/catalog?error=Failed to load products');
  }
});

/**
 * GET /catalog/:id
 * Display single product details
 */
router.get('/:id', async (req, res) => {
  try {
    // Use .lean() to get plain object for Handlebars
    let product = await Product.findById(req.params.id).lean();
    
    if (!product) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Product not found'
      });
    }
    
    // Add computed inStock
    product.inStock = product.stockCount > 0;
    
    // Get related products (same color, excluding current)
    let relatedProducts = await Product.find({
      color: product.color,
      _id: { $ne: product._id }
    }).limit(4).lean();
    
    relatedProducts = relatedProducts.map(p => ({
      ...p,
      inStock: p.stockCount > 0
    }));
    
    res.render('product', {
      title: product.name,
      product,
      relatedProducts
    });
  } catch (error) {
    console.error('[Catalog] Product error:', error);
    
    if (error.name === 'CastError') {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Product not found'
      });
    }
    
    res.render('error', {
      title: 'Error',
      message: 'Failed to load product'
    });
  }
});

export default router;
