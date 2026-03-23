const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendOtpEmail } = require('../utils/emailUtil');
const { otpLimiter, authLimiter } = require('../middleware/rateLimitMiddleware');
const { OAuth2Client } = require('google-auth-library');

const User = require('../models/User');

const router = express.Router();

// Google OAuth2 Client setup
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
);

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Helpers
const generateAccessToken = (user) => {
  return jwt.sign(
    { sub: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Middleware to protect routes
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = await User.findById(decoded.sub).select('-passwordHash');
      if (!req.user) {
        return res.status(401).json({ message: 'Không tìm thấy người dùng' });
      }
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Token không hợp lệ' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Không có quyền truy cập, thiếu token' });
  }
};


// @route   POST api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', otpLimiter, async (req, res) => {
  const { fullName, email, password, role } = req.body;

  try {
    const normalizedEmail = email.toLowerCase();
    
    const existed = await User.findOne({ email: normalizedEmail });
    if (existed) {
      return res.status(409).json({ message: 'Email đã tồn tại' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = new User({
      username: fullName,
      email: normalizedEmail,
      passwordHash: password, // Model handles hashing via pre-save middleware
      role: role || 'customer',
      verifyOtp: otp,
      verifyOtpExpiresAt: otpExpires,
    });

    try {
      await sendOtpEmail(normalizedEmail, otp);
      await user.save();
      res.status(201).json({ message: 'Đăng ký thành công. Vui lòng kiểm tra email để lấy OTP.' });
    } catch (mailError) {
      console.log('OTP for email', normalizedEmail, 'is:', otp);
      
      if (process.env.NODE_ENV === 'development' || !process.env.SMTP_USER) {
        await user.save();
        return res.status(201).json({ 
          message: 'Đăng ký thành công. Mail server chưa cấu hình, mã OTP được in ở console BE: ' + otp 
        });
      }
      
      res.status(500).json({ message: mailError.message });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Lỗi hệ thống khi đăng ký' });
  }
});

// @route   POST api/auth/verify
// @desc    Verify OTP
// @access  Public
router.post('/verify', async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      verifyOtp: otp,
      verifyOtpExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Mã OTP không đúng hoặc đã hết hạn' });
    }

    user.isVerified = true;
    user.verifyOtp = null;
    user.verifyOtpExpiresAt = null;
    await user.save();

    res.json({ message: 'Xác thực tài khoản thành công' });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ message: 'Lỗi xác thực OTP' });
  }
});

// @route   POST api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      console.log(`Login failed: User not found for email ${email.toLowerCase()}`);
      return res.status(401).json({ message: 'Thông tin đăng nhập không chính xác' });
    }

    if (!user.isVerified) {
      console.log(`Login failed: User ${email.toLowerCase()} is not verified`);
      return res.status(403).json({ message: 'Tài khoản chưa được xác thực email' });
    }

    if (user.isLocked) {
      console.log(`Login failed: User ${email.toLowerCase()} is locked`);
      return res.status(403).json({ message: 'Tài khoản của bạn đang bị khóa' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log(`Login failed: Password mismatch for user ${email.toLowerCase()}`);
      return res.status(401).json({ message: 'Thông tin đăng nhập không chính xác' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = generateAccessToken(user);

    res.json({
      user: {
        id: user._id,
        email: user.email,
        fullName: user.username,
        role: user.role,
      },
      tokens: {
        accessToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Lỗi hệ thống khi đăng nhập' });
  }
});

// @route   GET api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    res.json({
      success: true,
      data: req.user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Lỗi khi lấy thông tin người dùng' });
  }
});

// @route   GET api/auth/login-google
// @desc    Initiate Google OAuth2 flow
// @access  Public
router.get('/login-google', (req, res) => {
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  });
  res.json({ url });
});

// @route   GET api/auth/google/callback
// @desc    Handle Google OAuth2 callback
// @access  Public
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Get user info from Google
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture } = payload;

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user if doesn't exist
      user = new User({
        username: name,
        email,
        passwordHash: crypto.randomBytes(16).toString('hex'), // Set a random password to satisfy model requirement
        googleId,
        avatar: picture,
        role: 'customer',
        isVerified: true,
      });
      await user.save();
    } else {
      // Update googleId if not present
      if (!user.googleId) {
        user.googleId = googleId;
        user.isVerified = true;
        await user.save();
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    
    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    res.redirect(`${frontendUrl}/login?token=${accessToken}&role=${user.role}`);
  } catch (error) {
    console.error('Google Auth Error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
  }
});

// @route   POST api/auth/send-reset-otp
// @desc    Send password reset OTP (Used for resending too)
// @access  Public
router.post('/send-reset-otp', otpLimiter, async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'Email không tồn tại' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOtpEmail(email, otp);
    res.json({ message: 'Mã OTP đã được gửi về email của bạn' });
  } catch (error) {
    console.error('Send reset otp error:', error);
    res.status(500).json({ message: 'Lỗi khi gửi mã xác thực' });
  }
});

// @route   POST api/auth/verify-reset-otp
// @desc    Verify reset password OTP without changing password
// @access  Public
router.post('/verify-reset-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      resetOtp: otp,
      resetOtpExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Mã OTP không đúng hoặc đã hết hạn' });
    }

    res.json({ success: true, message: 'Xác thực OTP thành công' });
  } catch (error) {
    console.error('Verify reset otp error:', error);
    res.status(500).json({ message: 'Lỗi xác thực OTP' });
  }
});

// @route   POST api/auth/reset-password
// @desc    Reset password using OTP
// @access  Public
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      resetOtp: otp,
      resetOtpExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Mã OTP không đúng hoặc đã hết hạn' });
    }

    user.passwordHash = newPassword; // Middleware will hash it
    user.resetOtp = null;
    user.resetOtpExpiresAt = null;
    await user.save();

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Lỗi khi đặt lại mật khẩu' });
  }
});

module.exports = router;
