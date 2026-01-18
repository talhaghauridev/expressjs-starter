import express from 'express';
import authRoutes from './auth.route';
import usersRoutes from './users.route';
const routes = express.Router();

routes.use('/auth', authRoutes);
routes.use('/users', usersRoutes);

export default routes;
