import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/google', AuthController.getGoogleUrl);
router.get('/google/callback', AuthController.googleCallback);
router.get('/me', requireAuth, AuthController.getMe);
router.post('/demo-login', AuthController.demoLogin);
router.post('/logout', AuthController.logout);

export default router;
