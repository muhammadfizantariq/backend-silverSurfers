import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from './models/User.js';
import { sendAuditReportEmail, sendBasicEmail } from './email.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(user) {
  return jwt.sign({ id: user._id?.toString?.() || user._id, email: user.email, role: user.role || 'user' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function randomToken() { return crypto.randomBytes(32).toString('hex'); }
function hashToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }

router.post('/register', async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    email = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'User already exists' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const passwordHash = await bcrypt.hash(password, 10);
  const tokenPlain = randomToken();
  const verificationTokenHash = hashToken(tokenPlain);
    const verificationExpires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
    const user = await User.create({ email, passwordHash, role: 'user', provider: 'local', verified: false, verificationTokenHash, verificationExpires });
    // Re-use email sender; subject & text minimal (ideally separate template function)
    try {
      const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
      const verifyLink = `${frontendBase}/verify-email?token=${encodeURIComponent(tokenPlain)}`;
      await sendBasicEmail({
        to: email,
        subject: 'Verify your SilverSurfers account',
        text: `Welcome to SilverSurfers! Click the link below (or copy/paste into your browser) to verify your account. This link is valid for 24 hours.\n\n${verifyLink}\n\nIf you did not create this account, you can ignore this email.`,
      });
    } catch (e) {
      console.warn('Failed to send verification email:', e.message);
    }
    return res.status(201).json({ message: 'Registered. Please verify your email.' });
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ error: 'User already exists' });
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });
    const hashed = hashToken(token);
    const user = await User.findOne({ verificationTokenHash: hashed, verificationExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });
    user.verified = true;
    user.verificationTokenHash = undefined;
    user.verificationExpires = undefined;
    await user.save();
    const jwtToken = signToken(user);
    return res.json({ token: jwtToken, user: { email: user.email, role: user.role, verified: true } });
  } catch (err) {
    console.error('Verify email error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.verified) return res.status(400).json({ error: 'Already verified' });
  const tokenPlain = randomToken();
  user.verificationTokenHash = hashToken(tokenPlain);
    user.verificationExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);
    await user.save();
    try {
      const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3001';
      const verifyLink = `${frontendBase}/verify-email?token=${encodeURIComponent(tokenPlain)}`;
      await sendBasicEmail({
        to: user.email,
        subject: 'Verify your SilverSurfers account',
        text: `Use the link below to verify your account (valid 24h):\n\n${verifyLink}`,
      });
    } catch (e) {
      console.warn('Failed to send verification email:', e.message);
    }
    return res.json({ message: 'Verification email sent' });
  } catch (err) {
    console.error('Resend verification error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.verified) return res.status(403).json({ error: 'Email not verified' });
    const token = signToken(user);
    return res.json({ token, user: { email: user.email, role: user.role, verified: true } });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(200).json({ user: null });
    const token = auth.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id).lean();
    if (!user) return res.status(200).json({ user: null });
    return res.json({ user: { email: user.email, role: user.role, verified: user.verified } });
  } catch (err) {
    return res.status(200).json({ user: null });
  }
});

export default router;
