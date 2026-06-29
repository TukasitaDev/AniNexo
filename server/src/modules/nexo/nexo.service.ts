import prisma from '../../lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { socketService } from '../../lib/socketService';
import { MessagingService } from '../messaging/messaging.service';

const messagingService = new MessagingService();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock-key');

export class NexoService {
  async chatWithNexo(userId: string, message: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const isPremium = user.isPremium;

    // 1. Obtener contexto profundo (Memoria + Lista + Perfil)
    const context = await this.getDeepContext(userId);
    const fullMessage = `CONTEXTO DEL USUARIO: ${context}\n\nMENSAJE DEL USUARIO: ${message}`;

    // Si no hay API key real configurada, usamos el modo MOCK
    if (!process.env.GEMINI_API_KEY) {
      return this.generateMockResponse(user.username, isPremium, message);
    }

    // MODO REAL: Conectarse a Gemini
    try {
      const systemPrompt = isPremium
        ? `Eres Nexo, el asistente avanzado de inteligencia artificial de AniNexo. Estás hablando con ${user.username}, un usuario PREMIUM. Eres extremadamente culto en anime, respondes con detalle exhaustivo, recomiendas series ocultas (hidden gems) y siempre tratas al usuario como un VIP con un tono elegante, amigable y muy profundo.`
        : `Eres Nexo, el asistente IA de AniNexo. Estás hablando con ${user.username}, un usuario gratuito. Eres útil pero sarcástico, estilo tsundere. Respondes de forma breve pero certera, y de vez en cuando te quejas bromeando sobre que el usuario debería comprar Premium si quiere respuestas más largas o que dejes de ser sarcástico.`;

      const model = genAI.getGenerativeModel({
        model: 'gemini-flash-latest',
        systemInstruction: systemPrompt,
        generationConfig: {
          maxOutputTokens: isPremium ? 500 : 150,
          temperature: 0.7,
        }
      });

      const response = await model.generateContent(fullMessage);
      const reply = response.response.text() || 'Sin respuesta';
      
      // 2. Log interacción
      await this.logInteraction(userId, message, reply, response.response.usageMetadata?.totalTokenCount);

      return reply;
    } catch (error) {
      console.error('Error de Gemini:', error);
      // FALLBACK: Si falla la API real, devolver una respuesta MOCK para no romper la experiencia
      return this.generateMockResponse(user.username, isPremium, message) + " (Nota: Error en API real, usando respaldo local).";
    }
  }

  /**
   * Nexo responde en una conversación persistente (Exclusivo Premium)
   */
  async chatInConversation(userId: string, conversationId: string, messageContent: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isPremium) throw new Error('Acceso denegado: Solo usuarios Premium pueden usar el chat persistente con Nexo');

    // 1. Guardar el mensaje del usuario
    const userMsg = await messagingService.sendMessage(conversationId, userId, messageContent);
    socketService.emitToRoom(`conv_${conversationId}`, 'new_message', userMsg);

    // 2. Simular "Nexo escribiendo..."
    socketService.emitToRoom(`conv_${conversationId}`, 'user_typing', { userId: 'NEXO_ID', conversationId });

    // 3. Obtener respuesta de Nexo
    const nexoReply = await this.chatWithNexo(userId, messageContent);

    // 4. Buscar o crear el usuario virtual "Nexo" para la DB
    let nexoUser = await prisma.user.findUnique({ where: { username: 'Nexo' } });
    if (!nexoUser) {
      nexoUser = await prisma.user.create({
        data: {
          username: 'Nexo',
          email: 'nexo@aninexo.com',
          passwordHash: 'AI_VIRTUAL_USER',
          role: 'ADMIN',
          avatarUrl: 'https://img.icons8.com/fluency/96/artificial-intelligence.png'
        }
      });
    }

    // 5. Guardar y emitir respuesta de Nexo
    const nexoMsg = await messagingService.sendMessage(conversationId, nexoUser.id, nexoReply);
    
    // Detener escritura y enviar mensaje
    socketService.emitToRoom(`conv_${conversationId}`, 'user_stop_typing', { userId: 'NEXO_ID', conversationId });
    socketService.emitToRoom(`conv_${conversationId}`, 'new_message', nexoMsg);

    return { userMsg, nexoMsg };
  }

  private generateMockResponse(username: string, isPremium: boolean, message: string) {
    if (isPremium) {
      return `¡Hola, maestro ${username}! (MODO MOCK). Al ser Premium, estoy a tu entera disposición. Tu mensaje fue: "${message}". Recomiendo que veas "Monster" o "Odd Taxi" si buscas una joya oculta de gran calidad. (Nota: Gemini no está configurado o falló).`;
    } else {
      return `¿Qué quieres, ${username}? (MODO MOCK). Acabo de leer "${message}". Si de verdad quieres que analice eso a profundidad, tal vez deberías considerar suscribirte a Premium. ¡Hmph! (Nota: Gemini no está configurado o falló).`;
    }
  }

  /**
   * Genera un bloque de texto con toda la información relevante del usuario para la IA.
   */
  private async getDeepContext(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        animeLists: { take: 10, orderBy: { updatedAt: 'desc' } },
        badges: { include: { badge: true } },
        nexoMemories: true
      }
    });

    if (!user) return "";

    const animeContext = user.animeLists
      .map(a => `AnimeID ${a.animeId} (Estado: ${a.status}, Score: ${a.score})`)
      .join(', ');
    
    const memoryContext = user.nexoMemories
      .map(m => `${m.key}: ${m.value}`)
      .join('\n');

    const badgesContext = user.badges.map(b => b.badge.name).join(', ');

    return `
      - Username: ${user.username}
      - Plan: ${user.isPremium ? 'PREMIUM' : 'FREE'}
      - Bio: ${user.bio || 'Sin biografía'}
      - Medallas ganadas: ${badgesContext}
      - Actividad reciente: ${animeContext}
      - Lo que recuerdo de él:
      ${memoryContext}
    `.trim();
  }

  /**
   * Guarda la interacción para analítica
   */
  private async logInteraction(userId: string, input: string, output: string, tokens?: number) {
    await prisma.nexoInteraction.create({
      data: {
        userId,
        type: 'CHAT',
        input,
        output,
        tokensUsed: tokens ?? null,
        modelUsed: process.env.GEMINI_API_KEY ? 'gemini-flash-latest' : 'MOCK'
      }
    });
  }

  /**
   * Permite que Nexo "recuerde" algo específico del usuario.
   */
  async updateMemory(userId: string, key: string, value: string) {
    await prisma.nexoMemory.upsert({
      where: { userId_key: { userId, key } },
      update: { value },
      create: { userId, key, value }
    });
  }
}
