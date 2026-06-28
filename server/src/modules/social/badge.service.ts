import prisma from '../../lib/prisma';
import { NotificationService } from '../notification/notification.service';
import { socketService } from '../../lib/socketService';
import { NexoAutomation } from '../nexo/nexo.automation';

const notificationService = new NotificationService();
const nexoAutomation = new NexoAutomation();

export class BadgeService {
  /**
   * Otorga una medalla a un usuario si cumple los requisitos y no la tiene ya.
   */
  async awardBadgeIfEligible(userId: string, badgeName: string) {
    try {
      // 1. Verificar si el usuario ya tiene la medalla
      const existingBadge = await prisma.userBadge.findFirst({
        where: {
          userId,
          badge: { name: badgeName }
        }
      });

      if (existingBadge) return;

      // 2. Buscar la medalla en la DB
      const badge = await prisma.badge.findUnique({
        where: { name: badgeName }
      });

      if (!badge) {
        console.warn(`[BadgeService]: La medalla "${badgeName}" no existe en la base de datos.`);
        return;
      }

      // 3. Otorgar medalla
      await prisma.userBadge.create({
        data: {
          userId,
          badgeId: badge.id
        }
      });

      // 4. Notificar al usuario (Persistente + Socket + Push/Email si configurado)
      await notificationService.createNotification(userId, 'SYSTEM', {
        title: '¡Nueva Medalla Ganada!',
        message: `Has ganado la medalla: ${badgeName} ${badge.iconUrl}`,
        referenceId: badge.id,
        actorId: userId,
        actorUsername: null,
        actorAvatar: null
      });

      // Trigger Nexo Automation (Proactive message)
      await nexoAutomation.congratulateForBadge(userId, badgeName);

      console.log(`[BadgeService]: Medalla "${badgeName}" otorgada al usuario ${userId}`);
    } catch (error) {
      console.error('[BadgeService]: Error al otorgar medalla', error);
    }
  }

  /**
   * Lógica específica para medallas de conteo (ej. Coleccionista de Anime)
   */
  async checkAnimeCollector(userId: string) {
    const count = await prisma.animeList.count({
      where: { userId, status: 'COMPLETED' }
    });

    if (count >= 10) {
      await this.awardBadgeIfEligible(userId, 'Coleccionista');
    }
  }

  /**
   * Lógica para medallas sociales
   */
  async checkSocialite(userId: string) {
    const count = await prisma.follow.count({
      where: { followerId: userId }
    });

    if (count >= 5) {
      await this.awardBadgeIfEligible(userId, 'Socialite');
    }
  }
}
