import prisma from '../../lib/prisma';
import { BadgeService } from '../social/badge.service';
import { notificationService } from '../notification/notification.service';

const badgeService = new BadgeService();

export class FeedService {
  async createPost(userId: string, content: string, animeId?: number, mediaUrl?: string, isPrivate?: boolean) {
    const post = await prisma.post.create({
      data: {
        userId,
        content,
        animeId: animeId ?? null,
        mediaUrl: mediaUrl ?? null,
        isPrivate: isPrivate ?? false
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true, isPremium: true } },
        anime: { select: { id: true, titleRomaji: true } },
        _count: { select: { comments: true, likes: true } },
        likes: { select: { userId: true, reaction: true } }
      }
    });

    // Trigger: Medalla Primer Post
    await badgeService.awardBadgeIfEligible(userId, 'Primer Post');

    return post;
  }

  async updatePost(userId: string, postId: string, content: string, isPrivate?: boolean) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new Error('La publicación no existe');
    if (post.userId !== userId) throw new Error('No tienes permiso para editar esta publicación');

    return await prisma.post.update({
      where: { id: postId },
      data: { 
        content,
        isPrivate: isPrivate ?? post.isPrivate,
        updatedAt: new Date()
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true, isPremium: true } },
        anime: { select: { id: true, titleRomaji: true } },
        _count: { select: { comments: true, likes: true } },
        likes: { select: { userId: true, reaction: true } }
      }
    });
  }

  async deletePost(userId: string, postId: string) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new Error('La publicación no existe');
    if (post.userId !== userId) throw new Error('No tienes permiso para eliminar esta publicación');

    await prisma.post.delete({ where: { id: postId } });
    return { deleted: true };
  }

  async getGlobalFeed(limit: number = 20) {
    const posts = await prisma.post.findMany({
      take: limit,
      where: { isPrivate: false },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true, isPremium: true } },
        comments: {
          include: {
            user: { select: { id: true, username: true, avatarUrl: true } }
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: { select: { comments: true, likes: true } },
        likes: { select: { userId: true, reaction: true } },
        anime: { select: { id: true, titleRomaji: true, titleEnglish: true } }
      }
    });
    return posts;
  }

  async getUserFeed(userId: string) {
    return await prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true, isPremium: true } },
        anime: { select: { id: true, titleRomaji: true } },
        _count: { select: { comments: true, likes: true } },
        likes: { select: { userId: true, reaction: true } }
      }
    });
  }

  async getAnimeFeed(animeId: number) {
    return await prisma.post.findMany({
      where: { animeId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true, isPremium: true } },
        anime: { select: { id: true, titleRomaji: true } },
        _count: { select: { comments: true, likes: true } },
        likes: { select: { userId: true, reaction: true } }
      }
    });
  }

  async createComment(userId: string, postId: string, content: string) {
    const postExists = await prisma.post.findUnique({ where: { id: postId } });
    if (!postExists) {
      throw new Error('La publicación no existe');
    }

    return prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          userId,
          postId,
          content
        },
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } }
        }
      });

      await tx.postMemory.upsert({
        where: { userId_postId_type: { userId, postId, type: 'INTERACTION' } },
        create: { userId, postId, type: 'INTERACTION' },
        update: { createdAt: new Date() }
      });

      // Notificar al creador del post si el que comenta es otro usuario
      if (postExists.userId !== userId) {
        const commenter = await tx.user.findUnique({
          where: { id: userId },
          select: { username: true }
        });
        const commenterName = commenter?.username || 'Un usuario';

        await notificationService.createNotification(postExists.userId, 'COMMENT', {
          title: 'Nuevo comentario',
          message: `@${commenterName} comentó en tu publicación.`,
          referenceId: postId
        }).catch(err => console.error('[Notification]: Error al notificar comentario', err));
      }

      return comment;
    });
  }

  private async upsertMemory(userId: string, postId: string, type: 'INTERACTION' | 'SHARE') {
    return prisma.postMemory.upsert({
      where: { userId_postId_type: { userId, postId, type } },
      create: { userId, postId, type },
      update: { createdAt: new Date() }
    });
  }

  async savePost(userId: string, postId: string) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new Error('La publicación no existe');

    return prisma.savedPost.upsert({
      where: { userId_postId: { userId, postId } },
      create: { userId, postId },
      update: {}
    });
  }

  async unsavePost(userId: string, postId: string) {
    return prisma.savedPost.delete({
      where: { userId_postId: { userId, postId } }
    });
  }

  async getSavedPosts(userId: string) {
    return prisma.savedPost.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          include: {
            user: { select: { id: true, username: true, avatarUrl: true, isPremium: true } },
            anime: { select: { id: true, titleRomaji: true, titleEnglish: true } },
            _count: { select: { comments: true, likes: true } },
            likes: { select: { userId: true, reaction: true } }
          }
        }
      }
    });
  }

  async sharePost(userId: string, postId: string, content?: string) {
    const originalPost = await prisma.post.findUnique({
      where: { id: postId },
      include: { user: true, anime: true }
    });

    if (!originalPost) throw new Error('La publicación no existe');

    const sharedPost = await prisma.post.create({
      data: {
        userId,
        content: content || `Compartido de @${originalPost.user.username}: ${originalPost.content.substring(0, 100)}...`,
        animeId: originalPost.animeId,
        mediaUrl: originalPost.mediaUrl
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true, isPremium: true } },
        anime: { select: { id: true, titleRomaji: true } },
        _count: { select: { comments: true, likes: true } },
        likes: { select: { userId: true, reaction: true } }
      }
    });

    await this.upsertMemory(userId, postId, 'SHARE');

    // Notificar al dueño de la publicación original si es compartida por otro usuario
    if (originalPost.userId !== userId) {
      const sharer = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true }
      });
      const sharerName = sharer?.username || 'Un usuario';

      await notificationService.createNotification(originalPost.userId, 'SYSTEM', {
        title: 'Publicación Compartida',
        message: `@${sharerName} compartió tu publicación.`,
        referenceId: postId
      }).catch(err => console.error('[Notification]: Error al notificar compartido', err));
    }

    return sharedPost;
  }

  async getMemories(userId: string, limit: number = 50) {
    return prisma.postMemory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        post: {
          include: {
            user: { select: { id: true, username: true, avatarUrl: true, isPremium: true } },
            anime: { select: { id: true, titleRomaji: true, titleEnglish: true } },
            _count: { select: { comments: true, likes: true } },
            likes: { select: { userId: true, reaction: true } }
          }
        }
      }
    });
  }

  async addMemory(userId: string, postId: string, type: 'INTERACTION' | 'SHARE' = 'INTERACTION') {
    return this.upsertMemory(userId, postId, type);
  }

  async addMemoryFromInteraction(userId: string, postId?: string, commentId?: string) {
    let resolvedPostId = postId;

    if (commentId) {
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        select: { postId: true }
      });

      if (!comment) {
        throw new Error('El comentario no existe');
      }

      resolvedPostId = comment.postId;
    }

    if (!resolvedPostId) {
      throw new Error('postId o commentId son requeridos');
    }

    const postExists = await prisma.post.findUnique({
      where: { id: resolvedPostId },
      select: { id: true }
    });

    if (!postExists) {
      throw new Error('La publicación no existe');
    }

    return this.upsertMemory(userId, resolvedPostId, 'INTERACTION');
  }
}
