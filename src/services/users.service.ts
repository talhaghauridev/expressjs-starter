import { AuthProviderType } from '@/constants/auth';
import { User } from '@/database/schema';
import { SessionRepository } from '@/repositories/sessions.repository';
import { UserRepository } from '@/repositories/users.repository';
import ApiError from '@/utils/api-error';
import { comparePassword, hashPassword } from '@/utils/password';
import { StorageService } from './storage.service';
import { getUpdatedFields } from '@/utils/object-utils';

export class UsersService {
  static async getProfile(userId: string) {
    const user = await UserRepository.findById(userId, { password: false });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return { user };
  }

  static async updateProfile(userId: string, data: Partial<Pick<User, 'name'>>) {
    const user = await UserRepository.findById(userId, { password: false });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const updated = getUpdatedFields(user, data);

    if (!updated) {
      return { user };
    }

    const updatedUser = await UserRepository.update(userId, updated, { password: false });

    return { user: updatedUser };
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await UserRepository.findById(userId, {
      id: true,
      provider: true,
      password: true,
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.provider !== AuthProviderType.CUSTOM) {
      throw ApiError.badRequest(
        'Cannot change password for OAuth accounts. Please use your OAuth provider to manage your password.'
      );
    }

    const isPasswordMatch = await comparePassword(currentPassword, user.password!);

    if (!isPasswordMatch) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    const hashedPassword = await hashPassword(newPassword);

    await UserRepository.update(userId, { password: hashedPassword }, { id: true });

    return { message: 'Password changed successfully' };
  }

  static async getSessions(userId: string) {
    const sessions = await SessionRepository.findByUserId(userId);

    return { sessions };
  }

  static async deleteSession(userId: string, sessionId: string) {
    const sessions = await SessionRepository.findByUserId(userId, { id: true });

    const session = sessions.find((s) => s.id === sessionId);

    if (!session) {
      throw ApiError.notFound('Session not found');
    }

    await SessionRepository.deleteById(sessionId);

    return { message: 'Session deleted successfully' };
  }

  static async deleteAccount(userId: string, password: string) {
    const user = await UserRepository.findById(userId);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.provider === AuthProviderType.CUSTOM) {
      if (!user.password) {
        throw ApiError.badRequest('Account has no password set');
      }

      const isPasswordMatch = await comparePassword(password, user.password);

      if (!isPasswordMatch) {
        throw ApiError.badRequest('Password is incorrect');
      }
    }

    await UserRepository.delete(userId);

    return { message: 'Account deleted successfully' };
  }

  static async uploadAvatar(userId: string, file: Buffer, previousImageUrl?: string) {
    const user = await UserRepository.findById(userId, { id: true, image: true });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (previousImageUrl && previousImageUrl === user.image) {
      const publicId = StorageService.extractPublicId(previousImageUrl);
      if (publicId) {
        await StorageService.deleteImage(publicId);
      }
    }

    const { url } = await StorageService.uploadImage(file, 'avatars');

    const updatedUser = await UserRepository.update(userId, { image: url }, { image: true });

    return { image: updatedUser.image };
  }

  static async deleteAvatar(userId: string) {
    const user = await UserRepository.findById(userId, { id: true, image: true });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (!user.image) {
      throw ApiError.badRequest('No avatar to delete');
    }

    const publicId = StorageService.extractPublicId(user.image);
    if (publicId) {
      await StorageService.deleteImage(publicId);
    }

    const updatedUser = await UserRepository.update(userId, { image: null }, { password: false });

    return { user: updatedUser };
  }
}
