import prisma from '../../lib/prisma';
import { notificationService } from '../notification/notification.service';

export class MessagingService {
  
  async createOrGetConversation(userA: string, userB: string) {
    // Buscar si ya existe una conversación 1a1 entre estos dos usuarios
    const existingConvos = await prisma.conversation.findMany({
      where: {
        isGroup: false,
        participants: {
          every: {
            userId: { in: [userA, userB] }
          }
        }
      },
      include: {
        participants: true
      }
    });

    const exactMatch = existingConvos.find(c => c.participants.length === 2);
    if (exactMatch) return exactMatch;

    // Si no existe, crear nueva
    return await prisma.conversation.create({
      data: {
        isGroup: false,
        participants: {
          create: [
            { userId: userA },
            { userId: userB }
          ]
        }
      },
      include: {
        participants: true
      }
    });
  }

  async sendMessage(conversationId: string, senderId: string, content: string) {
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        content
      }
    });

    // Notificar a los otros participantes
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: senderId } },
      include: { user: { select: { username: true } } }
    });

    const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { username: true, avatarUrl: true } });

    for (const p of participants) {
      await notificationService.createNotification(p.userId, 'MESSAGE', {
        title: `Nuevo mensaje de @${sender?.username || 'Alguien'}`,
        message: content.length > 50 ? content.substring(0, 47) + '...' : content,
        referenceId: conversationId,
        targetConversationId: conversationId,
        actorId: senderId,
        actorUsername: sender?.username ?? null,
        actorAvatar: sender?.avatarUrl ?? null
      }).catch(() => {});
    }

    return message;
  }

  async getConversationMessages(conversationId: string, limit: number = 50) {
    return await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        sender: { select: { username: true, avatarUrl: true } }
      }
    });
  }

  async getUserConversations(userId: string) {
    return await prisma.conversation.findMany({
      where: {
        participants: { some: { userId } }
      },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true, avatarUrl: true } } }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }
  
  async markMessagesAsRead(conversationId: string, userId: string) {
    return await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false
      },
      data: {
        isRead: true
      }
    });
  }

  async createGroupChat(adminId: string, name: string, participantIds: string[], avatar?: string, theme?: string) {
    return await prisma.conversation.create({
      data: {
        isGroup: true,
        name,
        adminId,
        avatar,
        theme,
        participants: {
          create: participantIds.map(userId => ({ userId }))
        }
      },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true, avatarUrl: true } } }
        }
      }
    });
  }

  async addParticipants(conversationId: string, participantIds: string[], adminId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { adminId: true, isGroup: true }
    });

    if (!conversation?.isGroup) {
      throw new Error('Esta conversación no es un grupo');
    }
    if (conversation.adminId !== adminId) {
      throw new Error('Solo el administrador puede agregar participantes');
    }

    const existingParticipants = await prisma.conversationParticipant.findMany({
      where: { conversationId }
    });
    const existingUserIds = existingParticipants.map((p: { userId: string }) => p.userId);

    const newParticipants = participantIds.filter(id => !existingUserIds.includes(id));

    if (newParticipants.length > 0) {
      await prisma.conversationParticipant.createMany({
        data: newParticipants.map(userId => ({ userId, conversationId }))
      });
    }

    return prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true, avatarUrl: true } } }
        }
      }
    });
  }

  async getConversation(conversationId: string) {
    return await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true, avatarUrl: true } } }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100,
          include: { sender: { select: { username: true, avatarUrl: true } } }
        }
      }
    });
  }
}
