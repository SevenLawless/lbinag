import Conversation from '../models/Conversation.js';
import Product from '../models/Product.js';

/**
 * Gemini AI Service
 * 
 * This service handles all Gemini API interactions and conversation persistence.
 * If GEMINI_API_KEY is not set, it falls back to deterministic responses.
 * 
 * To use the real Gemini API:
 * 1. Set GEMINI_API_KEY in your .env file
 * 2. The endpoint is: https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
 * 3. See EXPLANATION.md for full API documentation
 */

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

/**
 * Fallback responses when no API key is configured
 * These provide a reasonable shopping assistant experience
 */
const FALLBACK_RESPONSES = [
  {
    keywords: ['hello', 'hi', 'hey', 'greetings'],
    reply: "Hello! Welcome to Lbinag! I'm your marble shopping assistant. How can I help you find the perfect marbles today?",
    action: null
  },
  {
    keywords: ['recommend', 'suggest', 'best', 'popular'],
    reply: "I'd recommend checking out our Blue marbles - they're absolutely stunning with deep ocean tones! Our Multicolor marbles are also very popular for collectors.",
    action: 'search',
    searchTerm: 'blue'
  },
  {
    keywords: ['cheap', 'affordable', 'budget', 'inexpensive'],
    reply: "We have marbles at various price points! Browse our collection to find great value options. Prices are in Moroccan Dirham (Dh).",
    action: 'search',
    searchTerm: ''
  },
  {
    keywords: ['red', 'crimson', 'scarlet'],
    reply: "Our Red marbles are bold and fiery! They make excellent display pieces and stand out in any collection.",
    action: 'search',
    searchTerm: 'red'
  },
  {
    keywords: ['blue', 'ocean', 'sky', 'azure'],
    reply: "Blue marbles are a customer favorite! They range from light sky blue to deep ocean tones. Let me show you our selection!",
    action: 'search',
    searchTerm: 'blue'
  },
  {
    keywords: ['green', 'emerald', 'forest'],
    reply: "Green marbles bring nature's elegance to your collection! We have shades from bright lime to deep forest green.",
    action: 'search',
    searchTerm: 'green'
  },
  {
    keywords: ['purple', 'violet', 'royal'],
    reply: "Our Purple marbles are royal and majestic! Perfect for those who love rich, deep colors.",
    action: 'search',
    searchTerm: 'purple'
  },
  {
    keywords: ['yellow', 'gold', 'sunny'],
    reply: "Yellow marbles are bright and cheerful! They add a sunny vibe to any marble collection.",
    action: 'search',
    searchTerm: 'yellow'
  },
  {
    keywords: ['multicolor', 'rainbow', 'swirl', 'pattern', 'colorful'],
    reply: "Our Multicolor marbles feature beautiful rainbow swirl patterns! Each one is unique and mesmerizing.",
    action: 'search',
    searchTerm: 'multicolor'
  },
  {
    keywords: ['black', 'dark', 'obsidian'],
    reply: "Black marbles are sleek and sophisticated! They look stunning when displayed with lighter colors.",
    action: 'search',
    searchTerm: 'black'
  },
  {
    keywords: ['white', 'pearl', 'clear'],
    reply: "White marbles are classic and elegant! They pair beautifully with any other color in your collection.",
    action: 'search',
    searchTerm: 'white'
  },
  {
    keywords: ['ship', 'delivery', 'arrive'],
    reply: "We ship across Morocco! Standard shipping takes 3-5 business days. All marbles are carefully packaged to prevent damage during transit.",
    action: null
  },
  {
    keywords: ['return', 'refund', 'exchange'],
    reply: "We offer a 30-day return policy on all marbles. If you're not satisfied, just send them back in their original condition for a full refund!",
    action: null
  },
  {
    keywords: ['help', 'support', 'question'],
    reply: "I'm here to help! You can ask me about our marble colors, get recommendations, or find specific types of marbles. What would you like to know?",
    action: null
  }
];

const DEFAULT_RESPONSE = {
  reply: "I'd be happy to help you find the perfect marbles! We have Red, Blue, Green, Yellow, Orange, Purple, Pink, White, Black, and Multicolor marbles. What color interests you?",
  action: null
};

/**
 * Find a fallback response based on message keywords
 */
function getFallbackResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  for (const response of FALLBACK_RESPONSES) {
    if (response.keywords.some(keyword => lowerMessage.includes(keyword))) {
      return response;
    }
  }
  
  return DEFAULT_RESPONSE;
}

/**
 * Call the real Gemini API
 * @param {Array} messages - Conversation history in Gemini format
 * @returns {Promise<string>} - The assistant's reply
 */
async function callGeminiAPI(messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return null;
  }
  
  try {
    console.log('[Gemini] Calling Gemini API...');
    
    // Convert messages to Gemini format
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
    
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500
        },
        systemInstruction: {
          parts: [{
            text: messages.find(m => m.role === 'system')?.content || 
              'You are a helpful marble shopping assistant for Lbinag. Prices are in Moroccan Dirham (Dh). We sell marbles in different colors: red, blue, green, yellow, orange, purple, pink, white, black, and multicolor.'
          }]
        }
      })
    });
    
    if (!response.ok) {
      console.error('[Gemini] API error:', response.status, await response.text());
      return null;
    }
    
    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    console.log('[Gemini] API response received');
    return reply || null;
    
  } catch (error) {
    console.error('[Gemini] API call failed:', error.message);
    return null;
  }
}

/**
 * Analyze the assistant's reply to determine actions
 * @param {string} reply - The assistant's reply
 * @param {string} userMessage - The original user message
 * @returns {Object} - Action details
 */
async function analyzeResponse(reply, userMessage) {
  const result = {
    action: null,
    product_id: null,
    topMatches: []
  };
  
  const lowerReply = reply.toLowerCase();
  const lowerMessage = userMessage.toLowerCase();
  
  // Check if we should search for products based on color
  const colorTerms = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'white', 'black', 'multicolor', 'marble'];
  let searchTerm = null;
  
  for (const term of colorTerms) {
    if (lowerMessage.includes(term) || lowerReply.includes(term)) {
      searchTerm = term;
      break;
    }
  }
  
  if (searchTerm) {
    try {
      const products = await Product.search(searchTerm);
      if (products.length > 0) {
        result.action = 'show_products';
        result.topMatches = products.slice(0, 3).map(p => ({
          id: p._id.toString(),
          name: p.name,
          price: p.price,
          color: p.color
        }));
        result.product_id = products[0]._id.toString();
      }
    } catch (error) {
      console.error('[Gemini] Product search failed:', error.message);
    }
  }
  
  return result;
}

/**
 * Send a message to the Gemini agent and get a response
 * @param {string} userId - The user's MongoDB ObjectId
 * @param {string} message - The user's message
 * @returns {Promise<Object>} - { reply, action, product_id, topMatches }
 */
export async function sendMessage(userId, message) {
  console.log(`[Gemini] Processing message for user ${userId}`);
  
  // Get or create conversation
  const conversation = await Conversation.getOrCreate(userId);
  
  // Add user message to conversation
  await conversation.addMessage('user', message);
  
  let reply;
  let action = null;
  let product_id = null;
  let topMatches = [];
  
  // Try real Gemini API first
  if (process.env.GEMINI_API_KEY) {
    reply = await callGeminiAPI(conversation.messages);
  }
  
  // Fall back to deterministic response if no API key or API failed
  if (!reply) {
    console.log('[Gemini] Using fallback response');
    const fallback = getFallbackResponse(message);
    reply = fallback.reply;
    
    if (fallback.action === 'search' && fallback.searchTerm !== undefined) {
      try {
        const products = await Product.search(fallback.searchTerm);
        if (products.length > 0) {
          action = 'show_products';
          topMatches = products.slice(0, 3).map(p => ({
            id: p._id.toString(),
            name: p.name,
            price: p.price,
            color: p.color
          }));
          product_id = products[0]._id.toString();
        }
      } catch (error) {
        console.error('[Gemini] Product search failed:', error.message);
      }
    }
  } else {
    // Analyze real Gemini response for actions
    const analysis = await analyzeResponse(reply, message);
    action = analysis.action;
    product_id = analysis.product_id;
    topMatches = analysis.topMatches;
  }
  
  // Save assistant response to conversation
  await conversation.addMessage('assistant', reply);
  
  console.log(`[Gemini] Response generated, action: ${action || 'none'}`);
  
  return {
    reply,
    action,
    product_id,
    topMatches
  };
}

/**
 * Get the full conversation history for a user
 * @param {string} userId - The user's MongoDB ObjectId
 * @returns {Promise<Array>} - Array of messages
 */
export async function getConversation(userId) {
  const conversation = await Conversation.getOrCreate(userId);
  
  // Return messages without the system message
  return conversation.messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp
    }));
}

/**
 * Clear conversation history for a user
 * @param {string} userId - The user's MongoDB ObjectId
 */
export async function clearConversation(userId) {
  await Conversation.findOneAndDelete({ userId });
  console.log(`[Gemini] Conversation cleared for user ${userId}`);
}

export default {
  sendMessage,
  getConversation,
  clearConversation
};
