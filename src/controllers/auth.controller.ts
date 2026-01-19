import passport from '@/config/passport.config';
import { AuthProviderType } from '@/constants/auth';
import { env } from '@/env';
import { AuthService } from '@/services/auth.service';
import ApiResponse from '@/utils/api-response';
import asyncHandler from '@/utils/async-handler';
import { DeviceInfo, getDeviceInfo } from '@/utils/get-device-info';
import {
  getFacebookAuthUrl,
  getGoogleAuthUrl,
  getValidatedRedirectUrl,
  decodeState,
  encodeState,
} from '@/utils/oauth-helpers';
import requestIp from 'request-ip';

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const deviceInfo = getDeviceInfo(req);
  const { message } = await AuthService.register(name, email, password, deviceInfo);
  return ApiResponse.created(res, {}, message);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const clientIp = requestIp.getClientIp(req);
  const deviceInfo = getDeviceInfo(req);

  const { accessToken, refreshToken, user } = await AuthService.login(
    email,
    password,
    deviceInfo,
    clientIp!
  );

  return ApiResponse.success(res, { accessToken, refreshToken, user }, 'Login successfully');
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query as { token: string };
  const clientIp = requestIp.getClientIp(req);
  const deviceInfo = getDeviceInfo(req);

  const { accessToken, refreshToken, user } = await AuthService.verifyEmail(
    token,
    deviceInfo,
    clientIp!
  );

  return ApiResponse.success(
    res,
    { accessToken, refreshToken, user },
    'Email verified successfully'
  );
});

export const verifyEmailOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const clientIp = requestIp.getClientIp(req);
  const deviceInfo = getDeviceInfo(req);

  const { accessToken, refreshToken, user } = await AuthService.verifyEmailOTP(
    email,
    otp,
    deviceInfo,
    clientIp!
  );

  return ApiResponse.success(
    res,
    { accessToken, refreshToken, user },
    'Email verified successfully'
  );
});

export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const deviceInfo = getDeviceInfo(req);

  const { message } = await AuthService.resendVerification(email, deviceInfo.platform);

  return ApiResponse.success(res, {}, message);
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const deviceInfo = getDeviceInfo(req);

  const { message } = await AuthService.forgotPassword(email, deviceInfo.platform);

  return ApiResponse.success(res, {}, message);
});

export const verifyResetPasswordOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const { resetToken, message } = await AuthService.verifyResetPasswordOTP(email, otp);
  return ApiResponse.success(res, { resetToken }, message);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const { message } = await AuthService.resetPassword(token, password);
  return ApiResponse.success(res, {}, message);
});

export const resetPasswordOTP = asyncHandler(async (req, res) => {
  const { resetToken, password } = req.body;
  const { message } = await AuthService.resetPasswordOTP(resetToken, password);
  return ApiResponse.success(res, {}, message);
});

export const resendResetPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const deviceInfo = getDeviceInfo(req);
  const { message } = await AuthService.resendResetPassword(email, deviceInfo.platform);
  return ApiResponse.success(res, {}, message);
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  const { accessToken, refreshToken: newRefreshToken } = await AuthService.refresh(refreshToken);

  return ApiResponse.success(
    res,
    { accessToken, refreshToken: newRefreshToken },
    'Token refreshed successfully'
  );
});

export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  const { message } = await AuthService.logout(refreshToken);

  return ApiResponse.success(res, null, message);
});

export const logoutAll = asyncHandler(async (req, res) => {
  const userId = req.user?.id!;

  const { message } = await AuthService.logoutAll(userId);

  return ApiResponse.success(res, null, message);
});

export const googleAuthUrl = asyncHandler(async (req, res) => {
  const { redirectUrl } = req.query;
  const deviceInfo = getDeviceInfo(req);
  const clientIp = requestIp.getClientIp(req)!;
  const finalRedirect = getValidatedRedirectUrl(
    redirectUrl as string,
    deviceInfo.platform,
    req,
    'google-auth'
  );
  const state = { deviceInfo, clientIp, redirectUrl: finalRedirect };
  const encodedState = encodeState(state);
  const authUrl = getGoogleAuthUrl(encodedState);

  return ApiResponse.success(res, { authUrl });
});

export const googleAuth = asyncHandler(async (req, res, next) => {
  const { redirectUrl } = req.query;
  const deviceInfo = getDeviceInfo(req);
  const clientIp = requestIp.getClientIp(req)!;
  const finalRedirect = getValidatedRedirectUrl(
    redirectUrl as string,
    deviceInfo.platform,
    req,
    'google-auth'
  );
  const state = { deviceInfo, clientIp, redirectUrl: finalRedirect };
  const encodedState = encodeState(state);

  passport.authenticate('google', {
    state: encodedState,
    session: false,
  })(req, res, next);
});

export const googleCallback = asyncHandler(async (req, res, next) => {
  const { state } = req.query;

  let redirectUrl = env.FRONTEND_URL;
  let deviceInfo: DeviceInfo;
  let clientIp: string;

  if (state && typeof state === 'string') {
    const decoded = decodeState(state);
    if (decoded) {
      redirectUrl = decoded.redirectUrl || env.FRONTEND_URL;
      deviceInfo = decoded.deviceInfo;
      clientIp = decoded.clientIp;
    }
  }

  passport.authenticate('google', { session: false }, async (err: any, profile: any) => {
    try {
      if (err || !profile) {
        return res.redirect(`${redirectUrl}?error=google_auth_failed`);
      }

      const result = await AuthService.handleOAuthLogin(
        profile,
        AuthProviderType.GOOGLE,
        deviceInfo,
        clientIp
      );

      return res.redirect(
        `${redirectUrl}?access_token=${result.accessToken}&refresh_token=${result.refreshToken}`
      );
    } catch (error: any) {
      const errorMessage = encodeURIComponent(error.message || 'Authentication failed');
      return res.redirect(`${redirectUrl}?error=${errorMessage}`);
    }
  })(req, res, next);
});

export const facebookAuthUrl = asyncHandler(async (req, res) => {
  const { redirectUrl } = req.query;
  const deviceInfo = getDeviceInfo(req);
  const clientIp = requestIp.getClientIp(req)!;
  const finalRedirect = getValidatedRedirectUrl(
    redirectUrl as string,
    deviceInfo.platform,
    req,
    'facebook-auth'
  );
  const state = { deviceInfo, clientIp, redirectUrl: finalRedirect };
  const encodedState = encodeState(state);
  const authUrl = getFacebookAuthUrl(encodedState);

  return ApiResponse.success(res, { authUrl });
});

export const facebookAuth = asyncHandler(async (req, res, next) => {
  const { redirectUrl } = req.query;
  const deviceInfo = getDeviceInfo(req);
  const clientIp = requestIp.getClientIp(req)!;
  const finalRedirect = getValidatedRedirectUrl(
    redirectUrl as string,
    deviceInfo.platform,
    req,
    'facebook-auth'
  );
  const state = { deviceInfo, clientIp, redirectUrl: finalRedirect };
  const encodedState = encodeState(state);

  passport.authenticate('facebook', {
    state: encodedState,
    session: false,
  })(req, res, next);
});

export const facebookCallback = asyncHandler(async (req, res, next) => {
  const { state } = req.query;

  let redirectUrl = env.FRONTEND_URL;
  let deviceInfo: DeviceInfo;
  let clientIp: string;

  if (state && typeof state === 'string') {
    const decoded = decodeState(state);
    if (decoded) {
      redirectUrl = decoded.redirectUrl || env.FRONTEND_URL;
      deviceInfo = decoded.deviceInfo;
      clientIp = decoded.clientIp;
    }
  }

  passport.authenticate('facebook', { session: false }, async (err: any, profile: any) => {
    try {
      if (err || !profile) {
        return res.redirect(`${redirectUrl}?error=facebook_auth_failed`);
      }

      const result = await AuthService.handleOAuthLogin(
        profile,
        AuthProviderType.FACEBOOK,
        deviceInfo,
        clientIp
      );

      return res.redirect(
        `${redirectUrl}?access_token=${result.accessToken}&refresh_token=${result.refreshToken}`
      );
    } catch (error: any) {
      const errorMessage = encodeURIComponent(error.message || 'Authentication failed');
      return res.redirect(`${redirectUrl}?error=${errorMessage}`);
    }
  })(req, res, next);
});
