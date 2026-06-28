import prisma from '../../lib/prisma';
import { notificationService } from '../notification/notification.service';

export class FriendService {
  async sendFriendRequest(userId: string, friendId: string) {
    if (userId === friendId) {
      throw new Error('No puedes agregarte como amigo de ti mismo');
    }

    const existing = await prisma.friendship.findUnique({
      where: { userId_friendId: { userId, friendId } }
    });

    if (existing) {
      if (existing.status === 'PENDING') {
        throw new Error('Ya enviaste solicitud de amistad');
      }
      if (existing.status === 'ACCEPTED') {
        throw new Error('Ya son amigos');
      }
    }

    const reverse = await prisma.friendship.findUnique({
      where: { userId_friendId: { userId: friendId, friendId: userId } }
    });

    if (reverse?.status === 'PENDING') {
      await prisma.friendship.update({
        where: { userId_friendId: { userId: friendId, friendId: userId } },
        data: { status: 'ACCEPTED' }
      });

      const actor = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, avatarUrl: true } });
      await notificationService.createNotification(friendId, 'SYSTEM', {
        title: 'Amistad aceptada',
        message: actor?.username ? `@${actor.username} aceptó tu solicitud.` : 'Un usuario aceptó tu solicitud.',
        referenceId: userId,
        actorId: userId,
        actorUsername: actor?.username ?? null,
        actorAvatar: actor?.avatarUrl ?? null
      }).catch(() => {});
      return { status: 'ACCEPTED' };
    }

    await prisma.friendship.create({
      data: { userId, friendId, status: 'PENDING' }
    });

    const actor = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, avatarUrl: true } });
    await notificationService.createNotification(friendId, 'SYSTEM', {
      title: 'Nueva solicitud de amistad',
      message: actor?.username ? `@${actor.username} te ha enviado una solicitud de amistad.` : 'Te ha enviado una solicitud de amistad.',
      referenceId: userId,
      actorId: userId,
      actorUsername: actor?.username ?? null,
      actorAvatar: actor?.avatarUrl ?? null
    }).catch(() => {});

    return { status: 'PENDING' };
  }

  async acceptFriendRequest(userId: string, friendId: string) {
    const friendship = await prisma.friendship.findUnique({
      where: { userId_friendId: { userId: friendId, friendId: userId } }
    });

    if (!friendship || friendship.status !== 'PENDING') {
      throw new Error('Solicitud de amistad no encontrada');
    }

    await prisma.friendship.update({
      where: { userId_friendId: { userId: friendId, friendId: userId } },
      data: { status: 'ACCEPTED' }
    });

    await prisma.friendship.create({
      data: { userId, friendId, status: 'ACCEPTED' }
    });

    return { status: 'ACCEPTED' };
  }

  async getFriends(userId: string) {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId, status: 'ACCEPTED' },
          { friendId: userId, status: 'ACCEPTED' }
        ]
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        friend: { select: { id: true, username: true, avatarUrl: true } }
      }
    });

    return friendships.map((f: { userId: string; friendId: string; user: any; friend: any }) => {
      return f.userId === userId ? f.friend : f.user;
    });
  }

  async getPendingRequests(userId: string) {
    const requests = await prisma.friendship.findMany({
      where: { friendId: userId, status: 'PENDING' },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } }
      }
    });

    return requests.map((r: { user: any }) => ({
      id: r.user.id,
      username: r.user.username,
      avatarUrl: r.user.avatarUrl
    }));
  }

  async removeFriend(userId: string, friendId: string) {
    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { userId, friendId, status: 'ACCEPTED' },
          { userId: friendId, friendId: userId, status: 'ACCEPTED' }
        ]
      }
    });

    await prisma.friendNickname.deleteMany({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId }
        ]
      }
    });

    return { removed: true };
  }

  async setFriendNickname(userId: string, friendId: string, nickname: string) {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId, status: 'ACCEPTED' },
          { userId: friendId, friendId: userId, status: 'ACCEPTED' }
        ]
      }
    });

    if (!friendship) {
      throw new Error('No son amigos');
    }

    return prisma.friendNickname.upsert({
      where: { userId_friendId: { userId, friendId } },
      create: { userId, friendId, nickname },
      update: { nickname }
    });
  }

  async getFriendNickname(userId: string, friendId: string) {
    const nickname = await prisma.friendNickname.findUnique({
      where: { userId_friendId: { userId, friendId } }
    });

    return nickname?.nickname || null;
  }

  async getUserFriendsWithNicknames(userId: string) {
    const friends = await this.getFriends(userId);

    const friendsWithNicknames = await Promise.all(
      friends.map(async (friend: any) => {
        const nickname = await this.getFriendNickname(userId, friend.id);
        return { ...friend, nickname: nickname || friend.username };
      })
    );

    return friendsWithNicknames;
  }

  async sendMessageToFriend(userId: string, friendId: string, content: string) {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId, status: 'ACCEPTED' },
          { userId: friendId, friendId: userId, status: 'ACCEPTED' }
        ]
      }
    });

    if (!friendship) {
      throw new Error('No son amigos');
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        participants: {
          some: { userId: userId }
        },
        AND: {
          participants: {
            some: { userId: friendId }
          }
        }
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          isGroup: false,
          participants: {
            create: [
              { userId },
              { userId: friendId }
            ]
          }
        }
      });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        content
      },
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true } }
      }
    });

    return { conversationId: conversation.id, message };
  }
}