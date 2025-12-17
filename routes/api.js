import { Router } from 'express';
import Product from '../models/Product.js';
import { sendMessage, getConversation, clearConversation } from '../services/gemini.js';
import { getChatUserId } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/agent
 * Chat with the Gemini agent
 * Request: { message: string }
 * Response: { reply: string, action: string|null, product_id: string|null, topMatches: array }
 */
router.post('/agent', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        error: 'Message is required'
      });
    }
    
    // Get user ID (real or guest)
    const userId = getChatUserId(req);
    
    console.log(`[API] Agent request from ${userId}: "${message.substring(0, 50)}..."`);
    
    // Send message to Gemini service
    const result = await sendMessage(userId, message.trim());
    
    res.json(result);
    
  } catch (error) {
    console.error('[API] Agent error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      reply: "I'm sorry, I'm having trouble right now. Please try again in a moment."
    });
  }
});

/**
 * GET /api/agent/history
 * Get conversation history
 */
router.get('/agent/history', async (req, res) => {
  try {
    const userId = getChatUserId(req);
    const messages = await getConversation(userId);
    
    res.json({ messages });
    
  } catch (error) {
    console.error('[API] History error:', error);
    res.status(500).json({
      error: 'Failed to load conversation history',
      messages: []
    });
  }
});

/**
 * POST /api/agent/clear
 * Clear conversation history
 */
router.post('/agent/clear', async (req, res) => {
  try {
    const userId = getChatUserId(req);
    await clearConversation(userId);
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('[API] Clear error:', error);
    res.status(500).json({
      error: 'Failed to clear conversation',
      success: false
    });
  }
});

/**
 * GET /api/products/search
 * Search products via API
 */
router.get('/products/search', async (req, res) => {
  try {
    const { q = '', color = 'all' } = req.query;
    const products = await Product.search(q, color);
    
    res.json({
      query: q,
      color: color,
      count: products.length,
      products: products.map(p => ({
        id: p._id,
        name: p.name,
        description: p.description,
        price: p.price,
        color: p.color,
        imageUrl: p.imageUrl,
        inStock: p.inStock,
        stockCount: p.stockCount
      }))
    });
    
  } catch (error) {
    console.error('[API] Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
