const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const User = require('../models/User');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER;

const smtpConfigured = Boolean(SMTP_USER && SMTP_PASS);
const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

const APP_TO_DB_ROLE = {
  Customer: 'customer',
  EventOwner: 'event_owner',
};

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function createToken(userId, email, role) {
  return jwt.sign({ sub: String(userId), email, role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

async function sendOtpEmail({ to, otp, subject, title }) {
  if (!transporter || !MAIL_FROM) {
    throw new Error('SMTP chưa cấu hình. Vui lòng thiết lập SMTP_USER/SMTP_PASS/MAIL_FROM trong .env');
  }

  await transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
        <h2 style="color: #0a7ea4; margin-bottom: 12px;">${title}</h2>
        <p>Mã OTP của bạn là:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 16px 0;">${otp}</div>
        <p>Mã có hiệu lực trong 10 phút.</p>
      </div>
    `,
  });
}

async function verifyPassword(plain, storedHash) {
  if (!storedHash) return false;

  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    return bcrypt.compare(plain, storedHash);
  }

  const sha256 = crypto.createHash('sha256').update(plain).digest('hex');
  return sha256 === storedHash;
}

function authGuard(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

router.post('/signup-option', async (_req, res) => {
  return res.json({
    roles: ['Customer', 'EventOwner'],
    message: 'Signup options loaded',
  });
});

router.post('/register', async (req, res) => {
  const { fullName, email, password, role, gender, birthday, address, phoneNumber } = req.body || {};

  if (!fullName || !email || !password || !role) {
    return res.status(422).json({ message: 'Thiếu dữ liệu đăng ký' });
  }

  const dbRole = APP_TO_DB_ROLE[role];
  if (!dbRole) {
    return res.status(422).json({ message: 'Role không hợp lệ' });
  }

  const normalizedEmail = normalizeEmail(email);
  const existed = await User.findOne({ email: normalizedEmail });

  const normalizedGender = ['male', 'female', 'other'].includes(String(gender)) ? String(gender) : null;
  const normalizedBirthday = birthday ? new Date(birthday) : null;
  if (normalizedBirthday && Number.isNaN(normalizedBirthday.getTime())) {
    return res.status(422).json({ message: 'Ngày sinh không hợp lệ' });
  }
  const normalizedPhone = phoneNumber ? String(phoneNumber).trim() : '';
  if (normalizedPhone && !/^0\d{9,10}$/.test(normalizedPhone)) {
    return res.status(422).json({ message: 'Số điện thoại không hợp lệ' });
  }
  if (existed) {
    return res.status(409).json({ message: 'Email đã tồn tại' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const otp = generateOtp();
  const now = new Date();
  const otpExp = new Date(Date.now() + 10 * 60 * 1000);

  const user = await User.create({
    username: String(fullName).trim(),
    email: normalizedEmail,
    passwordHash,
    role: dbRole,
    gender: normalizedGender,
    birthday: normalizedBirthday,
    phoneNumber: normalizedPhone || undefined,
    address: address ? String(address).trim() : undefined,
    avatar: '',
    isLocked: false,
    googleId: null,
    isVerified: false,
    verifyOtp: otp,
    verifyOtpExpiresAt: otpExp,
    resetOtp: null,
    resetOtpExpiresAt: null,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  });

  try {
    await sendOtpEmail({
      to: normalizedEmail,
      otp,
      subject: 'Mã OTP xác thực tài khoản Evenar',
      title: 'Xác thực tài khoản',
    });
  } catch (error) {
    await User.deleteOne({ _id: user._id });
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Gửi email OTP thất bại',
    });
  }

  return res.json({
    message: 'Đăng ký thành công. Vui lòng kiểm tra email để lấy OTP.',
  });
});

router.post('/verify', async (req, res) => {
  const { email, otp } = req.body || {};
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !otp) {
    return res.status(422).json({ message: 'Thiếu email hoặc OTP' });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

  if (!user.verifyOtp || !user.verifyOtpExpiresAt) {
    return res.status(422).json({ message: 'OTP không tồn tại hoặc đã dùng' });
  }

  if (new Date(user.verifyOtpExpiresAt).getTime() < Date.now()) {
    return res.status(422).json({ message: 'OTP đã hết hạn' });
  }

  if (String(user.verifyOtp) !== String(otp)) {
    return res.status(422).json({ message: 'OTP không đúng' });
  }

  user.isVerified = true;
  user.verifyOtp = undefined;
  user.verifyOtpExpiresAt = undefined;
  user.updatedAt = new Date();
  await user.save();

  return res.json({ message: 'Xác thực tài khoản thành công' });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return res.status(422).json({ message: 'Thiếu email hoặc mật khẩu' });
  }

  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!user) return res.status(401).json({ message: 'Thông tin đăng nhập không chính xác' });

  if (user.isLocked) return res.status(403).json({ message: 'Tài khoản đã bị khóa' });

  if (user.isVerified === false) {
    return res.status(403).json({ message: 'Tài khoản chưa xác thực OTP' });
  }

  if (user.isDeleted) {
    return res.status(403).json({ message: 'Tài khoản đã bị xóa' });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Thông tin đăng nhập không chính xác' });

  user.lastLoginAt = new Date();
  user.updatedAt = new Date();
  await user.save();

  const roleForToken = user.role || 'customer';
  const accessToken = createToken(user._id, user.email, roleForToken);

  return res.json({
    user: {
      id: String(user._id),
      email: user.email,
      fullName: user.username || '',
      role: roleForToken,
    },
    tokens: { accessToken },
  });
});

router.get('/login-google', async (_req, res) => {
  return res.status(501).json({ message: 'Google OAuth chưa cấu hình', url: null });
});

router.post('/logout', authGuard, async (_req, res) => {
  return res.json({ message: 'Đăng xuất thành công' });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) return res.status(422).json({ message: 'Thiếu email' });

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) return res.json({ message: 'Nếu email tồn tại, OTP đã được gửi' });

  const otp = generateOtp();
  const exp = new Date(Date.now() + 10 * 60 * 1000);

  user.resetOtp = otp;
  user.resetOtpExpiresAt = exp;
  user.updatedAt = new Date();
  await user.save();

  try {
    await sendOtpEmail({
      to: normalizedEmail,
      otp,
      subject: 'Mã OTP đặt lại mật khẩu Evenar',
      title: 'Đặt lại mật khẩu',
    });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Gửi email OTP thất bại',
    });
  }

  return res.json({
    message: 'OTP đặt lại mật khẩu đã được gửi qua email',
  });
});

router.post('/send-reset-otp', async (req, res) => {
  const { email } = req.body || {};
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) return res.status(422).json({ message: 'Thiếu email' });

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

  const otp = generateOtp();
  const exp = new Date(Date.now() + 10 * 60 * 1000);

  user.resetOtp = otp;
  user.resetOtpExpiresAt = exp;
  user.updatedAt = new Date();
  await user.save();

  try {
    await sendOtpEmail({
      to: normalizedEmail,
      otp,
      subject: 'Mã OTP đặt lại mật khẩu Evenar',
      title: 'Đặt lại mật khẩu',
    });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Gửi email OTP thất bại',
    });
  }

  return res.json({
    message: 'Đã gửi lại OTP đặt lại mật khẩu qua email',
  });
});

router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body || {};
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !otp || !newPassword) {
    return res.status(422).json({ message: 'Thiếu dữ liệu đặt lại mật khẩu' });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

  if (!user.resetOtp || !user.resetOtpExpiresAt) {
    return res.status(422).json({ message: 'OTP đặt lại mật khẩu không hợp lệ' });
  }

  if (new Date(user.resetOtpExpiresAt).getTime() < Date.now()) {
    return res.status(422).json({ message: 'OTP đã hết hạn' });
  }

  if (String(user.resetOtp) !== String(otp)) {
    return res.status(422).json({ message: 'OTP không đúng' });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetOtp = undefined;
  user.resetOtpExpiresAt = undefined;
  user.updatedAt = new Date();
  await user.save();

  return res.json({ message: 'Đặt lại mật khẩu thành công' });
});

router.post('/change-password', authGuard, async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};

  if (!oldPassword || !newPassword) {
    return res.status(422).json({ message: 'Thiếu mật khẩu cũ hoặc mật khẩu mới' });
  }

  const userId = req.auth.sub;
  const user = await User.findById(userId).select('+passwordHash');

  if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

  const ok = await verifyPassword(oldPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Mật khẩu hiện tại không đúng' });

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.updatedAt = new Date();
  await user.save();

  return res.json({ message: 'Đổi mật khẩu thành công' });
});

module.exports = router;
