import { AdminService } from '@/services/admin.service';
import ApiResponse from '@/utils/api-response';
import asyncHandler from '@/utils/async-handler';

export const listUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, role, search } = req.query;

  const result = await AdminService.listUsers({
    page: Number(page),
    limit: Number(limit),
    role: role as string | undefined,
    search: search as string | undefined,
  });

  return ApiResponse.success(res, result);
});

export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { user } = await AdminService.getUserById(id!);

  return ApiResponse.success(res, { user });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const adminId = req.user?.id!;

  const { user } = await AdminService.updateUserRole(id!, role, adminId);

  return ApiResponse.updated(res, { user }, 'User role updated successfully');
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = req.user?.id!;

  await AdminService.deleteUser(id!, adminId);

  return ApiResponse.success(res, null, 'User deleted successfully');
});

export const getStats = asyncHandler(async (_req, res) => {
  const result = await AdminService.getStats();

  return ApiResponse.success(res, result);
});
