import * as usersController from '@/controllers/users.controller';
import { authenticate } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validate.middleware';
import multerUpload from '@/middlewares/multer.middleware';
import {
  changePasswordSchema,
  deleteAccountSchema,
  deleteSessionSchema,
  updateProfileSchema,
  uploadAvatarSchema,
} from '@/validators/users.validator';
import { Router } from 'express';

const router = Router();

router.get('/me', authenticate, usersController.getMe);
router.patch(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  usersController.updateProfile
);
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  usersController.changePassword
);
router.get('/sessions', authenticate, usersController.getSessions);
router.delete(
  '/sessions/:sessionId',
  authenticate,
  validate(deleteSessionSchema),
  usersController.deleteSession
);
router.delete(
  '/account',
  authenticate,
  validate(deleteAccountSchema),
  usersController.deleteAccount
);
router.post(
  '/avatar',
  authenticate,
  multerUpload.single('avatar'),
  validate(uploadAvatarSchema),
  usersController.uploadAvatar
);

router.delete('/avatar', authenticate, usersController.deleteAvatar);

export default router;
