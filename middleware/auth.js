/**
 * Authentication Middleware
 * 
 * Provides middleware functions for protecting routes
 * and managing user authentication state.
 */

/**
 * Middleware to require authentication
 * Redirects to login page if user is not authenticated
 */
export function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  
  // Store the original URL to redirect back after login
  req.session.returnTo = req.originalUrl;
  
  res.redirect('/auth/login');
}

/**
 * Middleware to require guest (not logged in)
 * Redirects to home if user is already authenticated
 */
export function requireGuest(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  
  next();
}

/**
 * Middleware to attach user info to res.locals for views
 */
export function attachUserInfo(req, res, next) {
  // Attach user info to locals for use in templates
  res.locals.isAuthenticated = !!(req.session && req.session.userId);
  res.locals.userId = req.session?.userId || null;
  res.locals.userEmail = req.session?.userEmail || null;
  
  next();
}

/**
 * Helper function to get or create a session user ID for chat
 * Returns real userId if authenticated, or creates a temp ID for guests
 */
export function getChatUserId(req) {
  if (req.session.userId) {
    return req.session.userId;
  }
  
  // For guests, create a temporary chat ID stored in session
  if (!req.session.guestChatId) {
    req.session.guestChatId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  return req.session.guestChatId;
}

export default {
  requireAuth,
  requireGuest,
  attachUserInfo,
  getChatUserId
};
