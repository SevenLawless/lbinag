/**
 * Chat Widget Client-Side JavaScript
 * Handles the AI assistant chat interface
 */

(function() {
  'use strict';

  // DOM Elements
  const chatWidget = document.getElementById('chat-widget');
  const chatToggle = document.getElementById('chat-toggle');
  const chatPanel = document.getElementById('chat-panel');
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatClear = document.getElementById('chat-clear');
  const chatSuggestions = document.getElementById('chat-suggestions');

  // State
  let isOpen = false;
  let isLoading = false;

  /**
   * Toggle chat panel open/close
   */
  function toggleChat() {
    isOpen = !isOpen;
    chatWidget.classList.toggle('open', isOpen);
    
    if (isOpen) {
      chatInput.focus();
      loadHistory();
    }
  }

  /**
   * Add a message to the chat display
   * @param {string} content - Message content
   * @param {string} role - 'user' or 'assistant'
   * @param {Object} data - Optional additional data (topMatches)
   */
  function addMessage(content, role, data = {}) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;
    
    let html = `<div class="message-content">${escapeHtml(content)}`;
    
    // Add product suggestions if available
    if (data.topMatches && data.topMatches.length > 0) {
      html += '<div class="product-suggestions">';
      data.topMatches.forEach(product => {
        html += `<a href="/catalog/${product.id}" class="product-suggestion">
          ${escapeHtml(product.name)} - ${product.price} Dh
        </a>`;
      });
      html += '</div>';
    }
    
    html += '</div>';
    messageDiv.innerHTML = html;
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
  }

  /**
   * Show typing indicator
   */
  function showTyping() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message assistant';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
  }

  /**
   * Hide typing indicator
   */
  function hideTyping() {
    const typing = document.getElementById('typing-indicator');
    if (typing) {
      typing.remove();
    }
  }

  /**
   * Scroll chat to bottom
   */
  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} - Escaped text
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Send message to the agent
   * @param {string} message - User message
   */
  async function sendMessage(message) {
    if (isLoading || !message.trim()) return;
    
    isLoading = true;
    chatInput.disabled = true;
    
    // Add user message
    addMessage(message, 'user');
    chatInput.value = '';
    
    // Hide suggestions after first message
    if (chatSuggestions) {
      chatSuggestions.style.display = 'none';
    }
    
    // Show typing indicator
    showTyping();
    
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });
      
      const data = await response.json();
      
      hideTyping();
      
      if (data.error && !data.reply) {
        addMessage('Sorry, something went wrong. Please try again.', 'assistant');
      } else {
        addMessage(data.reply, 'assistant', data);
        
        // Handle actions
        if (data.action === 'open_cart') {
          setTimeout(() => {
            if (confirm('Would you like to view your cart?')) {
              window.location.href = '/cart';
            }
          }, 500);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      hideTyping();
      addMessage('Sorry, I had trouble connecting. Please try again.', 'assistant');
    } finally {
      isLoading = false;
      chatInput.disabled = false;
      chatInput.focus();
    }
  }

  /**
   * Load conversation history
   */
  async function loadHistory() {
    try {
      const response = await fetch('/api/agent/history');
      const data = await response.json();
      
      if (data.messages && data.messages.length > 0) {
        // Clear default welcome message if we have history
        chatMessages.innerHTML = '';
        
        data.messages.forEach(msg => {
          addMessage(msg.content, msg.role);
        });
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }

  /**
   * Clear conversation
   */
  async function clearConversation() {
    if (!confirm('Clear conversation history?')) return;
    
    try {
      await fetch('/api/agent/clear', { method: 'POST' });
      
      // Reset to default state
      chatMessages.innerHTML = `
        <div class="chat-message assistant">
          <div class="message-content">
            Hello! I'm your marble shopping assistant. How can I help you find the perfect marbles today? 🎱
          </div>
        </div>
      `;
      
      // Show suggestions again
      if (chatSuggestions) {
        chatSuggestions.style.display = 'flex';
      }
    } catch (error) {
      console.error('Failed to clear conversation:', error);
    }
  }

  /**
   * Handle suggestion button click
   * @param {Event} e - Click event
   */
  function handleSuggestion(e) {
    if (e.target.classList.contains('suggestion-btn')) {
      const message = e.target.dataset.message;
      if (message) {
        sendMessage(message);
      }
    }
  }

  // Event Listeners
  chatToggle.addEventListener('click', toggleChat);
  
  chatForm.addEventListener('submit', function(e) {
    e.preventDefault();
    sendMessage(chatInput.value);
  });
  
  chatClear.addEventListener('click', clearConversation);
  
  if (chatSuggestions) {
    chatSuggestions.addEventListener('click', handleSuggestion);
  }
  
  // Close chat on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isOpen) {
      toggleChat();
    }
  });

  // Expose for debugging
  window.lbinagChat = {
    toggle: toggleChat,
    send: sendMessage,
    clear: clearConversation
  };

})();
