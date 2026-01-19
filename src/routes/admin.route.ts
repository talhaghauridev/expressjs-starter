import { UserRoles } from '@/constants/auth';
import * as adminController from '@/controllers/admin.controller';
import { authenticate, authorize } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validate.middleware';
import {
  deleteUserSchema,
  getUserByIdSchema,
  listUsersSchema,
  updateUserRoleSchema,
} from '@/validators/admin.validator';
import { Router } from 'express';

const router = Router();

router.use(authenticate);

router.get(
  '/users',
  authorize(UserRoles.ADMIN, UserRoles.MODERATOR),
  validate(listUsersSchema),
  adminController.listUsers
);
router.get(
  '/users/:id',
  authorize(UserRoles.ADMIN, UserRoles.MODERATOR),
  validate(getUserByIdSchema),
  adminController.getUserById
);
router.patch(
  '/users/:id/role',
  authorize(UserRoles.ADMIN),
  validate(updateUserRoleSchema),
  adminController.updateUserRole
);
router.delete(
  '/users/:id',
  authorize(UserRoles.ADMIN),
  validate(deleteUserSchema),
  adminController.deleteUser
);
router.get('/stats', authorize(UserRoles.ADMIN, UserRoles.MODERATOR), adminController.getStats);

export default router;
