import { UsersService } from '@/services/users.service';
import ApiResponse from '@/utils/api-response';
import asyncHandler from '@/utils/async-handler';
import ApiError from '@/utils/api-error';

export const getMe = asyncHandler(async (req, res) => {
  const userId = req.user?.id!;

  const { user } = await UsersService.getProfile(userId);

  return ApiResponse.success(res, { user });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user?.id!;
  const { name } = req.body;

  const { user } = await UsersService.updateProfile(userId, { name });

  return ApiResponse.updated(res, { user }, 'Profile updated successfully');
});

export const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user?.id!;
  const { currentPassword, newPassword } = req.body;

  const { message } = await UsersService.changePassword(userId, currentPassword, newPassword);

  return ApiResponse.success(res, null, message);
});

export const getSessions = asyncHandler(async (req, res) => {
  const userId = req.user?.id!;

  const { sessions } = await UsersService.getSessions(userId);

  return ApiResponse.success(res, { sessions });
});

export const deleteSession = asyncHandler(async (req, res) => {
  const userId = req.user?.id!;
  const { sessionId } = req.params;

  const { message } = await UsersService.deleteSession(userId, sessionId!);

  return ApiResponse.success(res, null, message);
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user?.id!;
  const { password } = req.body;

  const { message } = await UsersService.deleteAccount(userId, password);

  return ApiResponse.success(res, null, message);
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  const userId = req.user?.id!;
  const { previousImageUrl } = req.body;

  if (!req.file) {
    throw ApiError.badRequest('No file uploaded');
  }

  const { image } = await UsersService.uploadAvatar(userId, req.file.buffer, previousImageUrl);

  return ApiResponse.success(res, { image }, 'Avatar uploaded successfully');
});

export const deleteAvatar = asyncHandler(async (req, res) => {
  const userId = req.user?.id!;

  const { user } = await UsersService.deleteAvatar(userId);

  return ApiResponse.success(res, { user }, 'Avatar deleted successfully');
});
