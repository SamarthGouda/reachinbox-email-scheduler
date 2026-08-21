import { Router } from 'express';
import { EmailController, scheduleEmailSchema } from '../controllers/email.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';

const router = Router();

// All email routes require authentication
router.use(requireAuth);

router.post('/schedule', validateBody(scheduleEmailSchema), EmailController.schedule);
router.get('/scheduled', EmailController.getScheduledEmails);
router.get('/sent', EmailController.getSentEmails);
router.get('/stats', EmailController.getEmailStats);
router.get('/:id', EmailController.getEmailById);

export default router;
