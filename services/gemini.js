import Conversation from '../models/Conversation.js';
import Product from '../models/Product.js';

/**
 * Gemini AI Service
 * 
 * This service handles all Gemini API interactions and conversation persistence.
 * Requires GEMINI_API_KEY to be set in .env file.
 */

// Using v1beta API with gemini-2.0-flash model (latest stable)
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Call the Gemini API
 * @param {Array} messages - Conversation history
 * @returns {Promise<string>} - The assistant's reply
 */
async function callGeminiAPI(messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('[Gemini] No API key configured');
    return null;
  }
  
  try {
    console.log('[Gemini] Calling Gemini API...');
    
    // Get system message for context
    const systemMessage = messages.find(m => m.role === 'system')?.content || 
      'You are a helpful marble shopping assistant for Lbinag. Prices are in Moroccan Dirham (Dh). We sell marbles in different colors: red, blue, green, yellow, orange, purple, pink, white, black, and multicolor.';
    
    // Convert messages to Gemini format
    const conversationMessages = messages.filter(m => m.role !== 'system');
    
    // Build contents array - prepend system context to the first user message
    const contents = [];
    let systemPrepended = false;
    
    for (const m of conversationMessages) {
      if (m.role === 'user' && !systemPrepended) {
        contents.push({
          role: 'user',
          parts: [{ text: `[Context: ${systemMessage}]\n\nUser: ${m.content}` }]
        });
        systemPrepended = true;
      } else {
        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        });
      }
    }
    
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
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Gemini] API error:', response.status, errorText);
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
 * @param {string} userId - The user's ID
 * @param {string} message - The user's message
 * @returns {Promise<Object>} - { reply, action, product_id, topMatches }
 */
export async function sendMessage(userId, message) {
  console.log(`[Gemini] Processing message for user ${userId}`);
  
  // Get or create conversation
  const conversation = await Conversation.getOrCreate(userId);
  
  // Add user message to conversation
  await conversation.addMessage('user', message);
  
  // Call Gemini API
  let reply = await callGeminiAPI(conversation.messages);
  
  // If API failed, return error message
  if (!reply) {
    reply = "I'm sorry, I'm having trouble connecting right now. Please check if the Gemini API key is configured correctly.";
  }
  
  // Analyze response for actions
  const analysis = await analyzeResponse(reply, message);
  
  // Save assistant response to conversation
  await conversation.addMessage('assistant', reply);
  
  console.log(`[Gemini] Response generated, action: ${analysis.action || 'none'}`);
  
  return {
    reply,
    action: analysis.action,
    product_id: analysis.product_id,
    topMatches: analysis.topMatches
  };
}

/**
 * Get the full conversation history for a user
 * @param {string} userId - The user's ID
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
 * @param {string} userId - The user's ID
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
