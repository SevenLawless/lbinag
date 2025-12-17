import nodemailer from 'nodemailer';

/**
 * Email Service for Magic Link Authentication
 * 
 * Uses nodemailer to send magic link emails via Gmail SMTP.
 * Requires SMTP credentials to be configured in environment variables.
 */

let transporter = null;

/**
 * Initialize the email transporter
 * Requires Gmail SMTP credentials in environment variables
 */
async function getTransporter() {
  if (transporter) {
    return transporter;
  }
  
  // Check if SMTP credentials are configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP credentials not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env file.');
  }
  
  console.log('[Mailer] Configuring SMTP transporter...');
  
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  
  // Verify connection
  try {
    await transporter.verify();
    console.log('[Mailer] SMTP connection verified successfully');
  } catch (error) {
    console.error('[Mailer] SMTP connection failed:', error.message);
    throw error;
  }
  
  return transporter;
}

/**
 * Send a magic link email to the user
 * @param {string} email - The recipient's email address
 * @param {string} token - The magic link token
 * @returns {Promise<Object>} - { success, messageId }
 */
export async function sendMagicLink(email, token) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const magicLink = `${baseUrl}/auth/verify?token=${token}`;
  
  console.log(`[Mailer] Sending magic link to ${email}`);
  
  try {
    const transport = await getTransporter();
    
    const mailOptions = {
      from: `"Lbinag Marbles" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '🔮 Your Magic Link to Lbinag',
      text: `
Welcome to Lbinag!

Click the link below to sign in to your account:

${magicLink}

This link will expire in 15 minutes.

If you didn't request this email, you can safely ignore it.

Happy marble shopping!
- The Lbinag Team
      `.trim(),
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; text-align: center; }
    .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
    .button:hover { opacity: 0.9; }
    .footer { background: #f7fafc; padding: 20px; text-align: center; color: #718096; font-size: 14px; }
    .expire { color: #e53e3e; font-size: 14px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔮 Lbinag</h1>
      <p>Nano Banana Marbles</p>
    </div>
    <div class="content">
      <h2>Welcome!</h2>
      <p>Click the button below to sign in to your account:</p>
      <a href="${magicLink}" class="button">Sign In to Lbinag</a>
      <p class="expire">⏰ This link expires in 15 minutes</p>
      <p style="color: #718096; font-size: 12px; margin-top: 30px;">
        If the button doesn't work, copy and paste this link:<br>
        <code style="background: #edf2f7; padding: 5px; border-radius: 3px; font-size: 11px;">${magicLink}</code>
      </p>
    </div>
    <div class="footer">
      <p>If you didn't request this email, you can safely ignore it.</p>
      <p>Happy marble shopping! 🎱</p>
    </div>
  </div>
</body>
</html>
      `.trim()
    };
    
    const info = await transport.sendMail(mailOptions);
    
    console.log(`[Mailer] Magic link sent! Message ID: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId
    };
    
  } catch (error) {
    console.error('[Mailer] Failed to send magic link:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  sendMagicLink
};
