import * as authController from '@/controllers/auth.controller';
import { authenticate } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validate.middleware';
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  oauthSchema,
  refreshTokenSchema,
  registerSchema,
  resendResetPasswordSchema,
  resendVerificationSchema,
  resetPasswordOTPSchema,
  resetPasswordSchema,
  verifyEmailOTPSchema,
  verifyEmailSchema,
  verifyResetPasswordOTPSchema,
} from '@/validators/auth.validator';
import { Router } from 'express';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/verify-email-otp', validate(verifyEmailOTPSchema), authController.verifyEmailOTP);
router.post(
  '/resend-verification',
  validate(resendVerificationSchema),
  authController.resendVerification
);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);

router.post(
  '/verify-reset-otp',
  validate(verifyResetPasswordOTPSchema),
  authController.verifyResetPasswordOTP
);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post(
  '/reset-password-otp',
  validate(resetPasswordOTPSchema),
  authController.resetPasswordOTP
);
router.post(
  '/resend-reset-password',
  validate(resendResetPasswordSchema),
  authController.resendResetPassword
);

router.post('/refresh-token', validate(refreshTokenSchema), authController.refresh);
router.post('/logout', authenticate, validate(logoutSchema), authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);

router.get('/google/url', validate(oauthSchema), authController.googleAuthUrl);
router.get('/google', validate(oauthSchema), authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

router.get('/facebook/url', validate(oauthSchema), authController.facebookAuthUrl);
router.get('/facebook', validate(oauthSchema), authController.facebookAuth);
router.get('/facebook/callback', authController.facebookCallback);

export default router;
