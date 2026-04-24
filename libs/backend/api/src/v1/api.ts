import { Router } from 'express';
import { languagesRouter } from './routers/languagesRouter.js';

export const v1Router = Router();

v1Router.use('/languages', languagesRouter);
