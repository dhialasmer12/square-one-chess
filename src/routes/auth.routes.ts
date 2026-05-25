import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', verifyToken, authController.logout);
router.get('/me', verifyToken, authController.getMe);
router.put('/profile', verifyToken, authController.updateProfile);
router.put('/elo', verifyToken, authController.updateElo);
router.post(
  '/request-email-verification',
  verifyToken,
  authController.requestEmailVerification
);
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);
router.post('/forgot-password', authController.forgotPassword);
router.get('/reset-password', authController.resetPasswordForm);
router.post('/reset-password', authController.resetPassword);

export default router;
