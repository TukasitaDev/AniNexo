import prisma from '../../lib/prisma';
import { NotificationType } from '@prisma/client';
import { socketService } from '../../lib/socketService';
import { emailService } from '../../lib/emailService';
import { pushService } from '../../lib/pushService';
import { logger } from '../../lib/logger';

export class NotificationService {
  /**
   * Crea una notificación y la distribuye por los canales permitidos
   */
  async createNotification(userId: string, type: NotificationType, data: { title: string, message: string, referenceId?: string }) {
    try {
      // 1. Obtener preferencias del usuario
      const prefs = await prisma.notificationPreference.findUnique({
        where: { userId_type: { userId, type } }
      });

      // Si no hay preferencias, usamos valores por defecto (todo activado)
      const emailEnabled = prefs ? prefs.emailEnabled : true;
      const pushEnabled = prefs ? prefs.pushEnabled : true;
      const inAppEnabled = prefs ? prefs.inAppEnabled : true;

      let notification = null;

      // 2. Notificación In-App (Persistente en DB)
      if (inAppEnabled) {
        notification = await prisma.notification.create({
          data: {
            userId,
            type,
            referenceId: data.referenceId ?? null,
            isRead: false
          }
        });

        // Emitir vía WebSocket (Tiempo Real)
        socketService.emitToUser(userId, 'notification', {
          ...notification,
          title: data.title,
          message: data.message
        });
      }

      // 3. Notificación vía Email
      if (emailEnabled) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
        if (user?.email) {
          emailService.sendTemplateEmail(user.email, 'NOTIFICATION', {
            title: data.title,
            message: data.message
          }).catch(err => logger.error('Error enviando email notification', err));
        }
      }

      // 4. Notificación vía Push
      if (pushEnabled) {
        const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
        for (const sub of subscriptions) {
          const pushConfig = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };
          pushService.sendPush(pushConfig, data.title, data.message)
            .catch(err => {
              if (err.statusCode === 410 || err.statusCode === 404) {
                // Eliminar suscripción expirada
                prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
              }
            });
        }
      }

      return notification;
    } catch (error) {
      logger.error('Error en createNotification orquestado', error);
      throw error;
    }
  }

  async getUserNotifications(userId: string) {
    const rawNotifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const enriched = await Promise.all(
      rawNotifications.map(async (n) => {
        let sender = null;
        let message = '';
        let title = '';

        if (n.type === 'FOLLOW' || n.type === 'MESSAGE' || (n.type === 'SYSTEM' && n.referenceId)) {
          // Buscamos el usuario asociado al referenceId
          const senderUser = await prisma.user.findUnique({
            where: { id: n.referenceId ?? '' },
            select: { id: true, username: true, avatarUrl: true }
          });
          if (senderUser) {
            sender = senderUser;
            if (n.type === 'FOLLOW') {
              title = '¡Nuevo seguidor!';
              message = `@${senderUser.username} comenzó a seguirte.`;
            } else if (n.type === 'SYSTEM') {
              title = 'Solicitud de Amistad';
              message = `@${senderUser.username} te ha enviado una solicitud de amistad.`;
            }
          }
        } else if (n.type === 'LIKE' && n.referenceId) {
          // El referenceId es el postId. Busquemos la última reacción en ese post
          const lastLike = await prisma.like.findFirst({
            where: { postId: n.referenceId, NOT: { userId } },
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, username: true, avatarUrl: true } } }
          });
          if (lastLike) {
            sender = lastLike.user;
            title = '¡Reacción!';
            message = `@${lastLike.user.username} reaccionó a tu publicación.`;
          } else {
            title = '¡Reacción!';
            message = 'Alguien reaccionó a tu publicación.';
          }
        } else if (n.type === 'COMMENT' && n.referenceId) {
          // El referenceId es el postId. Busquemos el último comentario en ese post
          const lastComment = await prisma.comment.findFirst({
            where: { postId: n.referenceId, NOT: { userId } },
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, username: true, avatarUrl: true } } }
          });
          if (lastComment) {
            sender = lastComment.user;
            title = 'Nuevo comentario';
            message = `@${lastComment.user.username} comentó en tu publicación.`;
          } else {
            title = 'Nuevo comentario';
            message = 'Alguien comentó en tu publicación.';
          }
        }

        // Valores por defecto
        if (!message) {
          if (n.type === 'BADGE') {
            title = '¡Nueva medalla!';
            message = '¡Has ganado una nueva medalla en AniNexo!';
          } else {
            title = 'Actualización del Nexo';
            message = 'Tienes una nueva notificación en tu cuenta.';
          }
        }

        return {
          ...n,
          title,
          message,
          sender
        };
      })
    );

    return enriched;
  }

  async markAsRead(notificationId: string) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });
  }

  async getPreferences(userId: string) {
    return prisma.notificationPreference.findMany({
      where: { userId }
    });
  }

  async updatePreference(userId: string, type: NotificationType, channels: { email?: boolean, push?: boolean, inApp?: boolean }) {
    // Para evitar errores de exactOptionalPropertyTypes: true, solo incluimos las propiedades definidas
    const updateData: any = {};
    if (channels.email !== undefined) updateData.emailEnabled = channels.email;
    if (channels.push !== undefined) updateData.pushEnabled = channels.push;
    if (channels.inApp !== undefined) updateData.inAppEnabled = channels.inApp;

    return prisma.notificationPreference.upsert({
      where: { userId_type: { userId, type } },
      update: updateData,
      create: {
        userId,
        type,
        emailEnabled: channels.email ?? true,
        pushEnabled: channels.push ?? true,
        inAppEnabled: channels.inApp ?? true
      }
    });
  }

  async savePushSubscription(userId: string, subscription: any) {
    return prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      }
    });
  }
}

export const notificationService = new NotificationService();
