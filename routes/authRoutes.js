import express from 'express';
import { login, logout, refreshToken, register, resendVerificationCode, verifyEmail } from '../controller/authController.js';
import { limitByIP } from '../middleware/rateLimiter.js'; 
const router = express.Router();

router.post('/auth/register', register);
router.post('/auth/login', limitByIP, login);
router.post('/auth/logout', logout);
router.post('/auth/refresh-token', limitByIP, refreshToken);
router.post('/auth/verify-email', limitByIP, verifyEmail);
router.post('/auth/resend-verification', limitByIP, resendVerificationCode);

export default router;