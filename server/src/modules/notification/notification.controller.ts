import { Response, NextFunction } from 'express';
import { notificationService } from './notification.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export class NotificationController {
  
  getMyNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const notifications = await notificationService.getUserNotifications(userId);
      res.status(200).json({ success: true, data: notifications });
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const notification = await notificationService.markAsRead(id);
      res.status(200).json({ success: true, data: notification });
    } catch (error) {
      next(error);
    }
  };

  markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const result = await notificationService.markAllAsRead(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getPreferences = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const prefs = await notificationService.getPreferences(userId);
      res.status(200).json({ success: true, data: prefs });
    } catch (error) {
      next(error);
    }
  };

  updatePreference = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const { type, email, push, inApp } = req.body;
      const pref = await notificationService.updatePreference(userId, type, { email, push, inApp });
      res.status(200).json({ success: true, data: pref });
    } catch (error) {
      next(error);
    }
  };

  subscribePush = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const subscription = req.body;
      await notificationService.savePushSubscription(userId, subscription);
      res.status(200).json({ success: true, message: 'Suscripción push guardada' });
    } catch (error) {
      next(error);
    }
  };
}
