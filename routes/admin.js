import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import Product from '../models/Product.js';

const router = Router();

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors available for products
const COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'white', 'black', 'multicolor'];

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'marble-' + uniqueSuffix + ext);
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
    cb(new Error('Only image files are allowed!'));
  }
});

/**
 * GET /admin/products
 * List all products with edit/delete actions
 */
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    
    res.render('admin/products', {
      title: 'Manage Products - Lbinag Admin',
      products,
      productCount: products.length,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('[Admin] Error loading products:', error);
    res.render('error', {
      title: 'Error',
      message: 'Failed to load products'
    });
  }
});

/**
 * GET /admin/products/new
 * Show create product form
 */
router.get('/products/new', (req, res) => {
  res.render('admin/product-form', {
    title: 'Add New Product - Lbinag Admin',
    colors: COLORS,
    product: null,
    isEdit: false
  });
});

/**
 * POST /admin/products/new
 * Create new product with image upload
 */
router.post('/products/new', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, color, stockCount } = req.body;
    
    // Validate required fields
    if (!name || !description || !price || !color) {
      return res.render('admin/product-form', {
        title: 'Add New Product - Lbinag Admin',
        colors: COLORS,
        product: req.body,
        isEdit: false,
        error: 'Please fill in all required fields'
      });
    }
    
    // Determine image URL
    let imageUrl = '/logo.png'; // Default
    if (req.file) {
      imageUrl = '/uploads/' + req.file.filename;
    }
    
    // Parse stock count and determine inStock status
    const parsedStockCount = parseInt(stockCount) || 0;
    const isInStock = parsedStockCount > 0;
    
    const product = new Product({
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      color,
      imageUrl,
      stockCount: parsedStockCount,
      inStock: isInStock
    });
    
    await product.save();
    
    console.log(`[Admin] Created product: ${product.name} (inStock: ${isInStock}, stock: ${parsedStockCount})`);
    
    res.redirect('/admin/products?success=Product created successfully');
  } catch (error) {
    console.error('[Admin] Error creating product:', error);
    res.render('admin/product-form', {
      title: 'Add New Product - Lbinag Admin',
      colors: COLORS,
      product: req.body,
      isEdit: false,
      error: 'Failed to create product: ' + error.message
    });
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
      title: `Edit ${product.name} - Lbinag Admin`,
      colors: COLORS,
      product,
      isEdit: true
    });
  } catch (error) {
    console.error('[Admin] Error loading product:', error);
    res.redirect('/admin/products?error=Failed to load product');
  }
});

/**
 * POST /admin/products/:id/edit
 * Update product with optional new image
 */
router.post('/products/:id/edit', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, color, stockCount } = req.body;
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.redirect('/admin/products?error=Product not found');
    }
    
    // Validate required fields
    if (!name || !description || !price || !color) {
      return res.render('admin/product-form', {
        title: `Edit ${product.name} - Lbinag Admin`,
        colors: COLORS,
        product: { ...product.toObject(), ...req.body },
        isEdit: true,
        error: 'Please fill in all required fields'
      });
    }
    
    product.name = name.trim();
    product.description = description.trim();
    product.price = parseFloat(price);
    product.color = color;
    
    // Parse stock count and determine inStock status
    const parsedStockCount = parseInt(stockCount) || 0;
    product.stockCount = parsedStockCount;
    product.inStock = parsedStockCount > 0;
    
    // Update image if new one uploaded
    if (req.file) {
      product.imageUrl = '/uploads/' + req.file.filename;
    }
    
    await product.save();
    
    console.log(`[Admin] Updated product: ${product.name} (inStock: ${product.inStock}, stock: ${product.stockCount})`);
    
    res.redirect('/admin/products?success=Product updated successfully');
  } catch (error) {
    console.error('[Admin] Error updating product:', error);
    res.redirect(`/admin/products/${req.params.id}/edit?error=Failed to update product`);
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
    
    console.log(`[Admin] Deleted product: ${product.name}`);
    
    res.redirect('/admin/products?success=Product deleted successfully');
  } catch (error) {
    console.error('[Admin] Error deleting product:', error);
    res.redirect('/admin/products?error=Failed to delete product');
  }
});

/**
 * POST /admin/products/delete-all
 * Delete all products
 */
router.post('/products/delete-all', async (req, res) => {
  try {
    const result = await Product.deleteMany({});
    
    console.log(`[Admin] Deleted all products (${result.deletedCount} items)`);
    
    res.redirect('/admin/products?success=All products deleted');
  } catch (error) {
    console.error('[Admin] Error deleting all products:', error);
    res.redirect('/admin/products?error=Failed to delete products');
  }
});

export default router;
