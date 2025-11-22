import express from 'express';
import { login, logout, refreshToken, register, resendVerificationCode, verifyEmail } from '../controller/authController.js';
import { limitByIP } from '../middleware/rateLimiter.js'; 
const router = express.Router();

router.post('/register', register);
router.post('/login', limitByIP, login);
router.post('/logout', logout);
router.post('/refresh-token', limitByIP, refreshToken);
router.post('/verify-email', limitByIP, verifyEmail);
router.post('/resend-verification', limitByIP, resendVerificationCode);

export default router;