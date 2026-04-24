import { json, Router } from 'express';
import { errorHandler } from '../middleware/errorHandler.js';
import { createLanguage } from '../middleware/languages/createLanguage.js';
import { initLanguageService } from '../middleware/languages/initLanguageService.js';
import { listLanguages } from '../middleware/languages/listLanguages.js';

export const languagesRouter = Router();

languagesRouter.use(json(), initLanguageService);

languagesRouter.post('/list', listLanguages);
languagesRouter.post('/', createLanguage);

languagesRouter.use(errorHandler);
