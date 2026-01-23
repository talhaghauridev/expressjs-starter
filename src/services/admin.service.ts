import { UserRoles } from '@/constants/auth';
import { UserRepository } from '@/repositories/users.repository';
import ApiError from '@/utils/api-error';

export class AdminService {
  static async listUsers(options: { page: number; limit: number; role?: string; search?: string }) {
    const users = await UserRepository.findAll(options, { password: false });
    const total = await UserRepository.count({ role: options.role });

    return {
      users,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages: Math.ceil(total / options.limit),
      },
    };
  }

  static async getUserById(userId: string) {
    const user = await UserRepository.findById(userId, { password: false });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return { user };
  }

  static async updateUserRole(userId: string, newRole: string, adminId: string) {
    if (userId === adminId) {
      throw ApiError.badRequest('Cannot change your own role');
    }

    const user = await UserRepository.findById(userId, { id: true });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const updatedUser = await UserRepository.update(
      userId,
      { role: newRole as any },
      { password: false }
    );

    return { user: updatedUser };
  }

  static async deleteUser(userId: string, adminId: string) {
    if (userId === adminId) {
      throw ApiError.badRequest('Cannot delete your own account');
    }

    const user = await UserRepository.findById(userId, { id: true });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    await UserRepository.delete(userId);

    return { message: 'User deleted successfully' };
  }

  static async getStats() {
    const total = await UserRepository.count();
    const byRole = await UserRepository.countByRole();

    return {
      stats: {
        totalUsers: total,
        usersByRole: {
          admin: byRole[UserRoles.ADMIN] || 0,
          moderator: byRole[UserRoles.MODERATOR] || 0,
          user: byRole[UserRoles.USER] || 0,
        },
      },
    };
  }
}
