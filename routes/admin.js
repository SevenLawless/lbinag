import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Product from '../models/Product.js';

const router = Router();

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.resolve(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Available colors
const COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'white', 'black', 'multicolor'];

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'product-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
  }
});

/**
 * GET /admin/products
 * List all products
 */
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    
    res.render('admin/products', {
      title: 'Admin - Products',
      products,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('[Admin] Error loading products:', error);
    res.render('admin/products', {
      title: 'Admin - Products',
      products: [],
      error: 'Failed to load products: ' + error.message
    });
  }
});

/**
 * GET /admin/products/new
 * Show create product form
 */
router.get('/products/new', (req, res) => {
  res.render('admin/product-form', {
    title: 'Admin - New Product',
    colors: COLORS,
    product: null,
    isEdit: false,
    error: req.query.error
  });
});

/**
 * POST /admin/products/new
 * Create new product
 */
router.post('/products/new', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, color, stockCount } = req.body;
    
    // Validation
    if (!name || !name.trim()) {
      return res.redirect('/admin/products/new?error=Product name is required');
    }
    if (!price || isNaN(parseFloat(price))) {
      return res.redirect('/admin/products/new?error=Valid price is required');
    }
    if (!color) {
      return res.redirect('/admin/products/new?error=Color is required');
    }
    
    // Handle image
    let imageUrl = '';
    if (req.file) {
      imageUrl = '/uploads/' + req.file.filename;
      console.log('[Admin] Image uploaded:', imageUrl);
    }
    
    const product = new Product({
      name: name.trim(),
      description: description ? description.trim() : '',
      price: parseFloat(price),
      color: color,
      stockCount: parseInt(stockCount) || 100,
      imageUrl: imageUrl
    });
    
    await product.save();
    console.log('[Admin] Product created:', product.name, 'ID:', product._id);
    
    res.redirect('/admin/products?success=Product created successfully');
  } catch (error) {
    console.error('[Admin] Error creating product:', error);
    res.redirect('/admin/products/new?error=' + encodeURIComponent(error.message));
  }
});

/**
 * GET /admin/products/:id/edit
 * Show edit product form
 */
router.get('/products/:id/edit', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.redirect('/admin/products?error=Product not found');
    }
    
    res.render('admin/product-form', {
      title: 'Admin - Edit Product',
      colors: COLORS,
      product: product,
      isEdit: true,
      error: req.query.error
    });
  } catch (error) {
    console.error('[Admin] Error loading product:', error);
    res.redirect('/admin/products?error=' + encodeURIComponent(error.message));
  }
});

/**
 * POST /admin/products/:id/edit
 * Update product
 */
router.post('/products/:id/edit', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, color, stockCount } = req.body;
    const productId = req.params.id;
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.redirect('/admin/products?error=Product not found');
    }
    
    // Validation
    if (!name || !name.trim()) {
      return res.redirect(`/admin/products/${productId}/edit?error=Product name is required`);
    }
    if (!price || isNaN(parseFloat(price))) {
      return res.redirect(`/admin/products/${productId}/edit?error=Valid price is required`);
    }
    
    // Update fields
    product.name = name.trim();
    product.description = description ? description.trim() : '';
    product.price = parseFloat(price);
    product.color = color || product.color;
    product.stockCount = parseInt(stockCount) || 0;
    
    // Update image if new one uploaded
    if (req.file) {
      product.imageUrl = '/uploads/' + req.file.filename;
      console.log('[Admin] New image uploaded:', product.imageUrl);
    }
    
    await product.save();
    console.log('[Admin] Product updated:', product.name);
    
    res.redirect('/admin/products?success=Product updated successfully');
  } catch (error) {
    console.error('[Admin] Error updating product:', error);
    res.redirect(`/admin/products/${req.params.id}/edit?error=` + encodeURIComponent(error.message));
  }
});

/**
 * POST /admin/products/:id/delete
 * Delete product
 */
router.post('/products/:id/delete', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.redirect('/admin/products?error=Product not found');
    }
    
    console.log('[Admin] Product deleted:', product.name);
    res.redirect('/admin/products?success=Product deleted successfully');
  } catch (error) {
    console.error('[Admin] Error deleting product:', error);
    res.redirect('/admin/products?error=' + encodeURIComponent(error.message));
  }
});

export default router;
