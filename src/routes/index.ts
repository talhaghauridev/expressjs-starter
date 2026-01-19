import express from 'express';
import authRoutes from './auth.route';
import usersRoutes from './users.route';
import adminRoutes from './admin.route';

const routes = express.Router();

routes.use('/auth', authRoutes);
routes.use('/users', usersRoutes);
routes.use('/admin', adminRoutes);

export default routes;
