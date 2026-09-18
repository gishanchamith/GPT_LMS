import { Router } from 'express';
import * as category from '../controllers/category.controller.js';

// Public: the visible categories, for course forms, catalog filters and onboarding.
const router = Router();
router.get('/', category.listActive);

export default router;
