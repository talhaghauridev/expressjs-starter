import { googleOAuthClient } from '@/clients/google-oauth';
import {
  AuthProviderType,
  AvailableAuthProviders,
  AvailablePlatforms,
  LocationType,
  PlatformType,
  VerificationType,
} from '@/constants/auth';
import { ExpiryTime } from '@/constants/expiry';
import { User } from '@/database/schema';
import { env } from '@/env';
import { SessionRepository } from '@/repositories/sessions.repository';
import { UserLocationRepository } from '@/repositories/user-locations.repository';
import { UserRepository } from '@/repositories/users.repository';
import { VerificationRepository } from '@/repositories/verifications.repository';
import ApiError from '@/utils/api-error';
import { DeviceInfo, formatDeviceInfo } from '@/utils/get-device-info';
import { getLocationFromIp } from '@/utils/get-location';
import { parseTimeToMs } from '@/utils/helpers';
import { comparePassword, hashPassword } from '@/utils/password';
import { withTransaction } from '@/utils/transaction';
import { TokenService } from './token.service';
import { VerificationService } from './verifications.service';

export class AuthService {
  static async register(name: string, email: string, password: string, deviceInfo: DeviceInfo) {
    const existingUser = await UserRepository.findByEmail(email, {
      id: true,
      isVerified: true,
    });

    if (existingUser?.isVerified === true) {
      throw ApiError.conflict('Email already registered');
    }

    const hashedPassword = await hashPassword(password);

    const { user, verificationToken } = await withTransaction(async (tx) => {
      let user;

      if (existingUser && !existingUser.isVerified) {
        user = await UserRepository.update(
          existingUser.id,
          {
            name,
            password: hashedPassword,
            createdAt: new Date(),
            isVerified: false,
          },
          { password: false },
          tx
        );
      } else {
        user = await UserRepository.create(
          {
            email,
            password: hashedPassword,
            name,
            provider: AuthProviderType.CUSTOM,
            isVerified: false,
          },
          { password: false },
          tx
        );
      }

      const verificationToken = await VerificationService.createVerificationToken(
        user.id,
        deviceInfo.platform,
        tx
      );

      return { user, verificationToken };
    });

    await VerificationService.sendVerificationEmail(
      user.email,
      verificationToken,
      deviceInfo.platform
    );

    return {
      user,
      message:
        deviceInfo.platform === PlatformType.WEB
          ? `Verification link sent to ${user.email}`
          : `Verification code sent to ${user.email}`,
    };
  }

  static async login(email: string, password: string, deviceInfo: DeviceInfo, clientIp: string) {
    const user = await UserRepository.findByEmail(email);

    if (!user || user.provider !== AuthProviderType.CUSTOM || user.isVerified === false) {
      throw ApiError.badRequest('Invalid credentials');
    }

    const isPasswordMatch = await comparePassword(password, user.password!);

    if (!isPasswordMatch) {
      throw ApiError.badRequest('Invalid credentials');
    }

    const { accessToken, refreshToken } = TokenService.generateAccessAndRefreshToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      provider: user.provider,
    });

    const location = await getLocationFromIp(clientIp);

    const session = await SessionRepository.create(
      {
        userId: user.id,
        refreshToken,
        deviceInfo: formatDeviceInfo(deviceInfo),
        expiresAt: new Date(Date.now() + parseTimeToMs(ExpiryTime.REFRESH_TOKEN)),
      },
      { refreshToken: true }
    );

    await UserLocationRepository.upsertLastLogin(
      user.id,
      {
        country: location.country,
        city: location.city,
        ip: clientIp,
        platform: deviceInfo.platform,
        device: deviceInfo.device,
        browser: deviceInfo.browser,
      },
      { userId: true }
    );

    return {
      accessToken,
      refreshToken: session.refreshToken,
      user: this.excludePassword(user),
    };
  }

  static async verifyEmail(token: string, deviceInfo: DeviceInfo, clientIp: string) {
    const verification = await VerificationRepository.findByToken(token);

    if (!verification) {
      throw ApiError.badRequest('This verification link is invalid or has already been used');
    }

    if (verification.expiresAt < new Date()) {
      await VerificationRepository.deleteByToken(token);
      throw ApiError.badRequest('This verification link has expired. Please request a new one');
    }

    if (verification.platform !== PlatformType.WEB) {
      throw ApiError.badRequest('Please use the verification link sent to your email');
    }

    const location = await getLocationFromIp(clientIp);

    const { user, refreshToken } = await withTransaction(async (tx) => {
      const user = await UserRepository.update(
        verification.userId,
        { isVerified: true },
        { password: false },
        tx
      );

      await VerificationRepository.deleteByToken(token, tx);

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      const refreshToken = TokenService.generateRefreshToken();

      await SessionRepository.create(
        {
          userId: user.id,
          refreshToken,
          deviceInfo: formatDeviceInfo(deviceInfo),
          expiresAt: new Date(Date.now() + parseTimeToMs(ExpiryTime.REFRESH_TOKEN)),
        },
        { refreshToken: true },
        tx
      );

      await UserLocationRepository.create(
        {
          userId: user.id,
          type: LocationType.REGISTRATION,
          country: location.country,
          city: location.city,
          ip: clientIp,
          platform: deviceInfo.platform,
          device: deviceInfo.device,
          browser: deviceInfo.browser,
        },
        { userId: true },
        tx
      );

      return { user, refreshToken };
    });

    const accessToken = TokenService.generateAccessToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      provider: user.provider,
    });

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  static async verifyEmailOTP(
    email: string,
    otp: string,
    deviceInfo: DeviceInfo,
    clientIp: string
  ) {
    const verification = await VerificationRepository.findByToken(otp);

    if (!verification) {
      throw ApiError.badRequest('Invalid verification code');
    }

    const isUser = await UserRepository.findById(verification.userId, { email: true });

    if (!isUser || isUser.email !== email) {
      throw ApiError.badRequest('Invalid verification code');
    }

    if (verification.expiresAt < new Date()) {
      await VerificationRepository.deleteByToken(otp);
      throw ApiError.badRequest('This verification code has expired. Please request a new one');
    }

    if (verification.platform !== PlatformType.MOBILE) {
      throw ApiError.badRequest('Please use the verification code sent to your email');
    }

    const location = await getLocationFromIp(clientIp);

    const { user, refreshToken } = await withTransaction(async (tx) => {
      const user = await UserRepository.update(
        verification.userId,
        { isVerified: true },
        { password: false },
        tx
      );

      await VerificationRepository.deleteByToken(otp, tx);

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      const refreshToken = TokenService.generateRefreshToken();

      await SessionRepository.create(
        {
          userId: user.id,
          refreshToken,
          deviceInfo: formatDeviceInfo(deviceInfo),
          expiresAt: new Date(Date.now() + parseTimeToMs(ExpiryTime.REFRESH_TOKEN)),
        },
        { refreshToken: true },
        tx
      );

      await UserLocationRepository.create(
        {
          userId: user.id,
          type: LocationType.REGISTRATION,
          country: location.country,
          city: location.city,
          ip: clientIp,
          platform: deviceInfo.platform,
          device: deviceInfo.device,
          browser: deviceInfo.browser,
        },
        { userId: true },
        tx
      );

      return { user, refreshToken };
    });

    const accessToken = TokenService.generateAccessToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      provider: user.provider,
    });

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  static async resendVerification(email: string, platform: (typeof AvailablePlatforms)[number]) {
    const user = await UserRepository.findByEmail(email, { id: true, isVerified: true });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.isVerified) {
      throw ApiError.badRequest('Email already verified.');
    }

    await VerificationService.sendVerification(user.id, email, platform);

    return {
      message: platform === PlatformType.WEB ? 'Verification link sent' : 'Verification code sent',
    };
  }

  static async refresh(refreshToken: string) {
    const session = await SessionRepository.findByRefreshToken(refreshToken);

    if (!session) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    if (session.expiresAt < new Date()) {
      await SessionRepository.deleteById(session.id);
      throw ApiError.unauthorized('Session expired');
    }

    const user = await UserRepository.findById(session.userId, { password: false });

    if (!user) {
      await SessionRepository.deleteById(session.id);
      throw ApiError.unauthorized('User not found');
    }

    const newAccessToken = TokenService.generateAccessToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      provider: user.provider,
    });

    const newRefreshToken = TokenService.generateRefreshToken();

    const updatedSession = await SessionRepository.update(
      session.id,
      {
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + parseTimeToMs(ExpiryTime.REFRESH_TOKEN)),
      },
      { refreshToken: true }
    );

    return {
      accessToken: newAccessToken,
      refreshToken: updatedSession.refreshToken,
    };
  }

  static async logout(refreshToken: string) {
    const session = await SessionRepository.findByRefreshToken(refreshToken, { id: true });

    if (!session) {
      return { message: 'Logged out successfully' };
    }

    await SessionRepository.deleteById(session.id);

    return { message: 'Logged out successfully' };
  }

  static async logoutAll(userId: string) {
    await SessionRepository.deleteAllByUserId(userId);

    return { message: 'Logged out from all devices' };
  }

  static async forgotPassword(email: string, platform: (typeof AvailablePlatforms)[number]) {
    const user = await UserRepository.findByEmail(email, {
      id: true,
      isVerified: true,
      provider: true,
    });

    if (!user || !user.isVerified || user.provider !== AuthProviderType.CUSTOM) {
      throw ApiError.badRequest('Email does not exist');
    }

    await VerificationService.sendPasswordReset(user.id, email, platform);

    return {
      message:
        platform === PlatformType.WEB
          ? 'Password reset link sent to your email'
          : 'Password reset code sent to your email',
    };
  }

  static async verifyResetPasswordOTP(email: string, otp: string) {
    const verification = await VerificationRepository.findByToken(otp, {
      userId: true,
      expiresAt: true,
      type: true,
      platform: true,
    });

    if (!verification) {
      throw ApiError.badRequest('Invalid reset code');
    }

    const user = await UserRepository.findById(verification.userId, { email: true });

    if (!user || user.email !== email) {
      throw ApiError.badRequest('Invalid reset code');
    }

    if (verification.expiresAt < new Date()) {
      await VerificationRepository.deleteByToken(otp);
      throw ApiError.badRequest('This reset code has expired. Please request a new one');
    }

    if (verification.type !== VerificationType.PASSWORD_RESET) {
      throw ApiError.badRequest('Invalid code type');
    }

    if (verification.platform !== PlatformType.MOBILE) {
      throw ApiError.badRequest('Please use the reset code sent to your email');
    }

    const resetToken = TokenService.generatePasswordResetToken(verification.userId);

    await VerificationRepository.deleteByToken(otp);

    return {
      resetToken,
      message: 'Reset code verified successfully',
    };
  }

  static async resetPassword(token: string, password: string) {
    const verification = await VerificationRepository.findByToken(token, {
      userId: true,
      expiresAt: true,
      type: true,
      platform: true,
    });

    if (!verification) {
      throw ApiError.badRequest('This password reset link is invalid or has already been used');
    }

    if (verification.expiresAt < new Date()) {
      await VerificationRepository.deleteByToken(token);
      throw ApiError.badRequest('This password reset link has expired. Please request a new one');
    }

    if (verification.type !== VerificationType.PASSWORD_RESET) {
      throw ApiError.badRequest('Invalid token type');
    }

    if (verification.platform !== PlatformType.WEB) {
      throw ApiError.badRequest('Please use the password reset link sent to your email');
    }

    const hashedPassword = await hashPassword(password);

    await withTransaction(async (tx) => {
      await UserRepository.update(
        verification.userId,
        { password: hashedPassword },
        { id: true },
        tx
      );
      await VerificationRepository.deleteByToken(token, tx);
    });

    return { message: 'Password reset successfully' };
  }

  static async resetPasswordOTP(resetToken: string, password: string) {
    const decoded = TokenService.verifyPasswordResetToken(resetToken);

    if (!decoded) {
      throw ApiError.badRequest('Invalid or expired reset token');
    }

    const hashedPassword = await hashPassword(password);

    await UserRepository.update(decoded.userId, { password: hashedPassword }, { id: true });

    return { message: 'Password reset successfully' };
  }

  static async resendResetPassword(email: string, platform: (typeof AvailablePlatforms)[number]) {
    const user = await UserRepository.findByEmail(email, {
      id: true,
      isVerified: true,
      provider: true,
    });

    if (!user || !user.isVerified || user.provider !== AuthProviderType.CUSTOM) {
      throw ApiError.badRequest('Email does not exist');
    }

    await VerificationService.sendPasswordReset(user.id, email, platform);

    return {
      message:
        platform === PlatformType.WEB
          ? 'Password reset link sent to your email'
          : 'Password reset code sent to your email',
    };
  }

  static async handleOAuthLogin(
    profile: any,
    provider: (typeof AvailableAuthProviders)[number],
    deviceInfo: DeviceInfo,
    clientIp: string
  ) {
    const normalized = this.normalizeOAuthProfile(profile, provider);

    if (!normalized.email) {
      throw ApiError.badRequest('Email not provided by OAuth provider');
    }

    const existingUser = await UserRepository.findByEmail(normalized.email, {
      password: false,
    });

    const location = await getLocationFromIp(clientIp);
    const locationData = {
      country: location.country,
      city: location.city,
      ip: clientIp,
      platform: deviceInfo.platform,
      device: deviceInfo.device,
      browser: deviceInfo.browser,
    };

    let user: User;
    let refreshToken: string;

    if (existingUser) {
      if (!existingUser.isVerified && existingUser.provider === AuthProviderType.CUSTOM) {
        const result = await withTransaction(async (tx) => {
          const updatedUser = await UserRepository.update(
            existingUser.id,
            {
              provider,
              providerId: normalized.providerId,
              isVerified: true,
              password: null,
              name: normalized.name,
              image: normalized.image,
            },
            { password: false },
            tx
          );

          await VerificationRepository.deleteAllByUserId(existingUser.id, tx);

          const refreshToken = TokenService.generateRefreshToken();

          await SessionRepository.create(
            {
              userId: updatedUser.id,
              refreshToken,
              deviceInfo: formatDeviceInfo(deviceInfo),
              expiresAt: new Date(Date.now() + parseTimeToMs(ExpiryTime.REFRESH_TOKEN)),
            },
            { refreshToken: true },
            tx
          );

          await UserLocationRepository.create(
            {
              userId: updatedUser.id,
              type: LocationType.REGISTRATION,
              ...locationData,
            },
            { id: true },
            tx
          );

          return { user: updatedUser, refreshToken };
        });

        user = result.user;
        refreshToken = result.refreshToken;
      } else {
        if (existingUser.provider !== provider) {
          const providerName = this.getProviderDisplayName(existingUser.provider);
          throw ApiError.conflict(
            `You have previously registered using ${providerName}. Please use the ${providerName} login option.`
          );
        }

        refreshToken = await withTransaction(async (tx) => {
          const refreshToken = TokenService.generateRefreshToken();

          await SessionRepository.create(
            {
              userId: existingUser.id,
              refreshToken,
              deviceInfo: formatDeviceInfo(deviceInfo),
              expiresAt: new Date(Date.now() + parseTimeToMs(ExpiryTime.REFRESH_TOKEN)),
            },
            { refreshToken: true },
            tx
          );

          await UserLocationRepository.upsertLastLogin(
            existingUser.id,
            locationData,
            { id: true },
            tx
          );

          return refreshToken;
        });

        user = existingUser;
      }
    } else {
      const result = await withTransaction(async (tx) => {
        const newUser = await UserRepository.create(
          {
            email: normalized.email,
            name: normalized.name,
            image: normalized.image,
            password: null,
            provider,
            providerId: normalized.providerId,
            isVerified: true,
          },
          { password: false },
          tx
        );

        await UserLocationRepository.create(
          {
            userId: newUser.id,
            type: LocationType.REGISTRATION,
            ...locationData,
          },
          { id: true },
          tx
        );

        const refreshToken = TokenService.generateRefreshToken();

        await SessionRepository.create(
          {
            userId: newUser.id,
            refreshToken,
            deviceInfo: formatDeviceInfo(deviceInfo),
            expiresAt: new Date(Date.now() + parseTimeToMs(ExpiryTime.REFRESH_TOKEN)),
          },
          { refreshToken: true },
          tx
        );

        return { user: newUser, refreshToken };
      });

      user = result.user;
      refreshToken = result.refreshToken;
    }

    const accessToken = TokenService.generateAccessToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      provider: user.provider,
    });

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  private static getProviderDisplayName(provider: string): string {
    if (provider === 'custom') {
      return 'Email/Password';
    }
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  }

  private static normalizeOAuthProfile(
    profile: any,
    provider: (typeof AvailableAuthProviders)[number]
  ) {
    switch (provider) {
      case AuthProviderType.GOOGLE:
        return {
          providerId: profile.id,
          email: profile.emails?.[0]?.value || '',
          name: profile.displayName || '',
          image: profile.photos?.[0]?.value || null,
        };

      case AuthProviderType.FACEBOOK:
        return {
          providerId: profile.id,
          email: profile.emails?.[0]?.value || profile._json?.email || '',
          name: profile.displayName || profile._json?.name || '',
          image: profile.photos?.[0]?.value || profile._json?.picture?.data?.url || null,
        };

      default:
        throw ApiError.badRequest(`Unsupported provider: ${provider}`);
    }
  }

  static async verifyGoogleToken(idToken: string, deviceInfo: DeviceInfo, clientIp: string) {
    let payload;
    try {
      const ticket = await googleOAuthClient.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (error) {
      throw ApiError.badRequest('Invalid Google token');
    }

    if (!payload || !payload.email) {
      throw ApiError.badRequest('Invalid token payload');
    }

    const profile = {
      id: payload.sub,
      emails: [{ value: payload.email }],
      displayName: payload.name || '',
      photos: [{ value: payload.picture || null }],
    };

    return await this.handleOAuthLogin(profile, AuthProviderType.GOOGLE, deviceInfo, clientIp);
  }

  public static excludePassword<T extends { password?: string | null }>(
    user: T | null
  ): Omit<T, 'password'> | null {
    if (!user) return null;
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
