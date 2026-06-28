import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();
const controller = new NotificationController();

router.use(authenticateToken);

router.get('/', controller.getMyNotifications);
router.patch('/:id/read', controller.markAsRead);
router.patch('/read-all', controller.markAllAsRead);
router.get('/preferences', controller.getPreferences);
router.put('/preferences', controller.updatePreference);
router.post('/subscribe', controller.subscribePush);

export default router;
