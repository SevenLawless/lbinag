import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';
import MagicLink from '../models/MagicLink.js';
import { sendMagicLink } from '../services/mailer.js';
import { requireGuest } from '../middleware/auth.js';

const router = Router();

/**
 * GET /auth/login
 * Display the login form
 */
router.get('/login', requireGuest, (req, res) => {
  res.render('login', {
    title: 'Sign In - Lbinag',
    error: req.query.error,
    success: req.query.success
  });
});

/**
 * POST /auth/login
 * Process login form - send magic link
 */
router.post('/login', requireGuest, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.redirect('/auth/login?error=Please enter a valid email address');
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Create magic link token
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    // Save magic link to database
    await MagicLink.create({
      email: normalizedEmail,
      token,
      expiresAt
    });
    
    console.log(`[Auth] Magic link created for ${normalizedEmail}`);
    
    // Send the email
    const result = await sendMagicLink(normalizedEmail, token);
    
    if (!result.success) {
      console.error('[Auth] Failed to send magic link email:', result.error);
      return res.redirect('/auth/login?error=Failed to send email. Please check SMTP configuration.');
    }
    
    console.log(`[Auth] Magic link sent to ${normalizedEmail}`);
    
    res.redirect('/auth/check-email?email=' + encodeURIComponent(normalizedEmail));
    
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.redirect('/auth/login?error=An error occurred. Please try again.');
  }
});

/**
 * GET /auth/check-email
 * Display "check your email" page
 */
router.get('/check-email', (req, res) => {
  const email = req.query.email || 'your email';
  
  res.render('check-email', {
    title: 'Check Your Email - Lbinag',
    email
  });
});

/**
 * GET /auth/verify
 * Verify magic link token and log user in
 */
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.redirect('/auth/login?error=Invalid or missing token');
    }
    
    // Find the magic link
    const magicLink = await MagicLink.findOne({ token });
    
    if (!magicLink) {
      return res.redirect('/auth/login?error=Invalid or expired link');
    }
    
    // Check if already used
    if (magicLink.used) {
      return res.redirect('/auth/login?error=This link has already been used');
    }
    
    // Check if expired
    if (new Date() > magicLink.expiresAt) {
      return res.redirect('/auth/login?error=This link has expired');
    }
    
    // Mark token as used
    magicLink.used = true;
    await magicLink.save();
    
    // Find or create user
    let user = await User.findOne({ email: magicLink.email });
    
    if (!user) {
      user = await User.create({ email: magicLink.email });
      console.log(`[Auth] New user created: ${magicLink.email}`);
    }
    
    // Set session
    req.session.userId = user._id.toString();
    req.session.userEmail = user.email;
    
    console.log(`[Auth] User logged in: ${user.email}`);
    
    // Redirect to stored return URL or home
    const returnTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    
    res.redirect(returnTo);
    
  } catch (error) {
    console.error('[Auth] Verification error:', error);
    res.redirect('/auth/login?error=An error occurred. Please try again.');
  }
});

/**
 * GET /auth/logout
 * Log user out
 */
router.get('/logout', (req, res) => {
  const email = req.session.userEmail;
  
  req.session.destroy((err) => {
    if (err) {
      console.error('[Auth] Logout error:', err);
    } else {
      console.log(`[Auth] User logged out: ${email}`);
    }
    res.redirect('/');
  });
});

export default router;
