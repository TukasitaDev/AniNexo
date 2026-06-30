import { Server, Socket } from 'socket.io';
import { MessagingService } from './modules/messaging/messaging.service';
import { logger } from './lib/logger';
import jwt from 'jsonwebtoken';
import { telemetryService } from './modules/admin/telemetry.service';

import { createAdapter } from '@socket.io/redis-adapter';
import { redis } from './lib/redis';

const messagingService = new MessagingService();

const onlineUsers = new Map<string, string>();
// userId -> presence status ('online' | 'away' | 'busy' | 'offline')
const userPresences = new Map<string, string>();

export function setupSockets(io: Server) {
  // Configuración de Redis Adapter para escalado horizontal (Solo si hay Redis real)
  if (process.env.REDIS_URL) {
    const pubClient = redis;
    const subClient = redis.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('[socket]: Redis Adapter activado para escalado horizontal');
  } else {
    logger.warn('[socket]: Redis URL no encontrada. Saltando Redis Adapter (Single Instance Mode)');
  }

  // Namespaces
  const chatNamespace = io.of('/chat');
  const notificationNamespace = io.of('/notifications');
  const nexoNamespace = io.of('/nexo-stream');

  // Middleware de Autenticación para Sockets (Global)
  io.use((socket, next) => {
    let token = socket.handshake.auth.token;
    if (!token || token === 'null' || token === 'undefined') {
      logger.warn('[socket-auth]: No token provided in handshake or token is placeholder');
      return next(new Error('Authentication error: No token provided'));
    }

    // Limpiar prefijo "Bearer " si existe
    if (token.startsWith('Bearer ')) {
      token = token.substring(7);
    }

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        logger.error('[socket-auth]: JWT_SECRET not configured on the server');
        return next(new Error('Authentication error: JWT_SECRET not configured on the server'));
      }
      const decoded = jwt.verify(token, secret) as any;
      socket.data.user = decoded;
      next();

    } catch (err: any) {
      logger.error(`[socket-auth]: Token validation failed. Token prefix: "${token ? token.substring(0, 15) : ''}...". Error: ${err.message}`);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.user.id;
    onlineUsers.set(userId, socket.id);
    logger.info(`[socket]: Usuario ${userId} conectado - Socket ${socket.id}`);

    // Telemetría: Iniciar Sesión
    const userAgent = socket.handshake.headers['user-agent'];
    const session = await telemetryService.startSession(
      userId, 
      socket.handshake.address, 
      Array.isArray(userAgent) ? userAgent[0] : userAgent
    );
    if (session) socket.data.sessionId = session.id;

    // Unirse a sala personal para notificaciones directas
    socket.join(`user:${userId}`);

    // Notificar a otros que este usuario está online
    userPresences.set(userId, 'online');
    socket.broadcast.emit('user_status', { userId, status: 'online' });

    // Permitir al usuario cambiar su estado (online, busy, away)
    socket.on('set_status', (data: { status: 'online' | 'away' | 'busy' }) => {
      userPresences.set(userId, data.status);
      io.emit('user_status', { userId, status: data.status });
    });

    // Permitir obtener el estado de presencia de un usuario o lista de usuarios
    socket.on('get_user_statuses', (userIds: string[], callback?: (statuses: Record<string, string>) => void) => {
      const statuses: Record<string, string> = {};
      userIds.forEach(id => {
        statuses[id] = userPresences.get(id) || 'offline';
      });
      if (callback) callback(statuses);
    });

    // Unirse a una sala de conversación
    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conv_${conversationId}`);
      logger.info(`[socket]: Usuario ${userId} se unió a conv_${conversationId}`);
    });

    // Enviar y recibir mensajes en tiempo real
    socket.on('send_message', async (data: { conversationId: string, senderId: string, content: string }) => {
      try {
        const message = await messagingService.sendMessage(data.conversationId, data.senderId, data.content);
        io.to(`conv_${data.conversationId}`).emit('new_message', message);
        
        // Notificación opcional al destinatario si no está en la sala del chat
        // io.to(`user:${targetId}`).emit('notification', { type: 'NEW_MESSAGE', sender: userId });
      } catch (error) {
        logger.error('[socket]: Error guardando mensaje', error);
      }
    });

    // Indicador de Escritura
    socket.on('typing', (data: { conversationId: string }) => {
      socket.to(`conv_${data.conversationId}`).emit('user_typing', { userId, conversationId: data.conversationId });
    });

    socket.on('stop_typing', (data: { conversationId: string }) => {
      socket.to(`conv_${data.conversationId}`).emit('user_stop_typing', { userId, conversationId: data.conversationId });
    });

    // Mensaje Leído
    socket.on('message_read', async (data: { conversationId: string }) => {
      try {
        // Guardar el visto en la base de datos de verdad
        await messagingService.markMessagesAsRead(data.conversationId, userId);
        // Notificar en tiempo real en la sala
        io.to(`conv_${data.conversationId}`).emit('message_seen', { conversationId: data.conversationId, userId });
      } catch (error) {
        logger.error('[socket]: Error marcando mensaje como leído', error);
      }
    });

    socket.on('disconnect', async () => {
      onlineUsers.delete(userId);
      userPresences.delete(userId);
      socket.broadcast.emit('user_status', { userId, status: 'offline' });
      
      // Telemetría: Finalizar Sesión
      if (socket.data.sessionId) {
        await telemetryService.endSession(socket.data.sessionId);
      }

      logger.info(`[socket]: Usuario ${userId} desconectado`);
    });
  });
}
