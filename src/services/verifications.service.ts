import { AvailablePlatforms, PlatformType, VerificationType } from '@/constants/auth';
import { ExpiryTime } from '@/constants/expiry';
import { env } from '@/env';
import { VerificationRepository } from '@/repositories/verifications.repository';
import { parseTimeToMs } from '@/utils/helpers';
import { sendEmail } from '@/utils/send-email';
import { Transaction } from '@/utils/transaction';
import crypto from 'crypto';

const generateSecureOTP = (): string => {
  const bytes = crypto.randomBytes(4);
  const num = bytes.readUInt32BE(0) % 900000;
  return (num + 100000).toString();
};

export class VerificationService {
  static async createVerificationToken(
    userId: string,
    platform: (typeof AvailablePlatforms)[number],
    tx?: Transaction
  ) {
    const token =
      platform === PlatformType.WEB ? crypto.randomBytes(32).toString('hex') : generateSecureOTP();

    const expiryTime =
      platform === PlatformType.WEB
        ? ExpiryTime.EMAIL_VERIFICATION_LINK
        : ExpiryTime.EMAIL_VERIFICATION_OTP;

    const expiresAt = new Date(Date.now() + parseTimeToMs(expiryTime));

    await VerificationRepository.createVerification(
      userId,
      VerificationType.EMAIL,
      platform,
      token,
      expiresAt,
      tx
    );

    return token;
  }

  static async sendVerificationEmail(
    email: string,
    token: string,
    platform: (typeof AvailablePlatforms)[number]
  ) {
    if (platform === PlatformType.WEB) {
      const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
      await sendEmail({
        to: email,
        subject: 'Verify Your Email Address',
        text: `Click this link to verify your email: ${verificationUrl}`,
      });
    } else {
      await sendEmail({
        to: email,
        subject: 'Your Verification Code',
        text: `Your verification code is: ${token}`,
      });
    }
  }

  static async sendVerification(
    userId: string,
    email: string,
    platform: (typeof AvailablePlatforms)[number]
  ) {
    if (platform === PlatformType.WEB) {
      await this.sendVerificationLink(userId, email);
    } else {
      await this.sendVerificationOTP(userId, email);
    }
  }

  private static async sendVerificationLink(userId: string, email: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + parseTimeToMs(ExpiryTime.EMAIL_VERIFICATION_LINK));

    await VerificationRepository.createVerification(
      userId,
      VerificationType.EMAIL,
      PlatformType.WEB,
      token,
      expiresAt
    );

    const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
    await sendEmail({
      to: email,
      subject: 'Verify Your Email Address',
      text: `Click this link to verify your email: ${verificationUrl}`,
    });
  }

  private static async sendVerificationOTP(userId: string, email: string) {
    const otp = generateSecureOTP();
    const expiresAt = new Date(Date.now() + parseTimeToMs(ExpiryTime.EMAIL_VERIFICATION_OTP));

    await VerificationRepository.createVerification(
      userId,
      VerificationType.EMAIL,
      PlatformType.MOBILE,
      otp,
      expiresAt
    );

    await sendEmail({
      to: email,
      subject: 'Your Verification Code',
      text: `Your verification code is: ${otp}`,
    });
  }

  static async createPasswordResetToken(
    userId: string,
    platform: (typeof AvailablePlatforms)[number],
    tx?: Transaction
  ) {
    const token =
      platform === PlatformType.WEB ? crypto.randomBytes(32).toString('hex') : generateSecureOTP();

    const expiryTime =
      platform === PlatformType.WEB
        ? ExpiryTime.EMAIL_VERIFICATION_LINK
        : ExpiryTime.EMAIL_VERIFICATION_OTP;

    const expiresAt = new Date(Date.now() + parseTimeToMs(expiryTime));

    await VerificationRepository.createVerification(
      userId,
      VerificationType.PASSWORD_RESET,
      platform,
      token,
      expiresAt,
      tx
    );

    return token;
  }

  static async sendPasswordResetEmail(
    email: string,
    token: string,
    platform: (typeof AvailablePlatforms)[number]
  ) {
    if (platform === PlatformType.WEB) {
      await sendEmail({
        to: email,
        subject: 'Reset Your Password',
        text: `Click this link to reset your password: ${env.FRONTEND_URL}/reset-password?token=${token}`,
      });
    } else {
      await sendEmail({
        to: email,
        subject: 'Your Password Reset Code',
        text: `Your password reset code is: ${token}`,
      });
    }
  }

  static async sendPasswordReset(
    userId: string,
    email: string,
    platform: (typeof AvailablePlatforms)[number]
  ) {
    let token: string;
    let expiresAt: Date;
    let subject: string;
    let message: string;

    if (platform === PlatformType.WEB) {
      token = crypto.randomBytes(32).toString('hex');
      expiresAt = new Date(Date.now() + parseTimeToMs(ExpiryTime.EMAIL_VERIFICATION_LINK));
      subject = 'Reset Your Password';
      message = `Click this link to reset your password: ${env.FRONTEND_URL}/reset-password?token=${token}`;
    } else {
      token = generateSecureOTP();
      expiresAt = new Date(Date.now() + parseTimeToMs(ExpiryTime.EMAIL_VERIFICATION_OTP));
      subject = 'Your Password Reset Code';
      message = `Your password reset code is: ${token}`;
    }

    await VerificationRepository.createVerification(
      userId,
      VerificationType.PASSWORD_RESET,
      platform,
      token,
      expiresAt
    );

    await sendEmail({
      to: email,
      subject,
      text: message,
    });
  }
}
