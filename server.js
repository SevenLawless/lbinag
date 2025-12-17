/**
 * Lbinag - Nano Banana Marble E-Commerce
 * Main Server Entry Point
 * 
 * This is a server-side rendered Express application selling marbles.
 * Features: Magic link auth, Gemini AI chat, MongoDB persistence.
 */

import 'dotenv/config';
import express from 'express';
import { engine } from 'express-handlebars';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Route imports
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import apiRoutes from './routes/api.js';
import adminRoutes from './routes/admin.js';

// Middleware imports
import { attachUserInfo } from './middleware/auth.js';

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lbinag';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-in-production';

// Initialize Express
const app = express();

// ==========================================
// DATABASE CONNECTION
// ==========================================
console.log('[Server] Connecting to MongoDB...');

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('[Server] MongoDB connected successfully');
  })
  .catch(err => {
    console.error('[Server] MongoDB connection error:', err.message);
    process.exit(1);
  });

// ==========================================
// HANDLEBARS SETUP
// ==========================================
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {
    // Helper to check equality
    eq: (a, b) => a === b,
    // Helper for math operations
    math: (a, operator, b) => {
      a = parseFloat(a);
      b = parseFloat(b);
      switch (operator) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return a / b;
        default: return a;
      }
    },
    // Format price in Moroccan Dirham
    formatPrice: (price) => {
      return parseFloat(price).toFixed(2);
    },
    // JSON stringify for debugging
    json: (obj) => JSON.stringify(obj, null, 2)
  }
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// ==========================================
// MIDDLEWARE
// ==========================================

// Parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration with MongoDB store
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGODB_URI,
    collectionName: 'sessions',
    ttl: 7 * 24 * 60 * 60, // 7 days
    autoRemove: 'native'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Attach user info to all responses
app.use(attachUserInfo);

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ==========================================
// ROUTES
// ==========================================

// Home page
app.get('/', (req, res) => {
  res.render('home', {
    title: 'Lbinag - Nano Banana Marbles'
  });
});

// Auth routes
app.use('/auth', authRoutes);

// Catalog routes
app.use('/catalog', catalogRoutes);

// API routes
app.use('/api', apiRoutes);

// Admin routes
app.use('/admin', adminRoutes);

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 - Not Found',
    message: 'The page you are looking for does not exist.'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server] Error:', err);
  
  res.status(err.status || 500).render('error', {
    title: 'Error',
    message: err.message || 'Something went wrong',
    error: process.env.NODE_ENV === 'development' ? err.stack : null
  });
});

// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, () => {
  console.log('==========================================');
  console.log('  LBINAG - NANO BANANA MARBLES');
  console.log('==========================================');
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Server] Gemini API: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Using fallback'}`);
  console.log('==========================================');
});

export default app;
