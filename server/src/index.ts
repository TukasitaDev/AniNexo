// Force Restart: 2026-05-15 13:09 (Port Clear)
import dotenv from 'dotenv';
dotenv.config();

process.env.DIRECT_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;

import express, { json, urlencoded } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import authRoutes from './modules/auth/auth.routes';
import animeRoutes from './modules/anime/anime.routes';
import profileRoutes from './modules/profile/profile.routes';
import listRoutes from './modules/list/list.routes';
import feedRoutes from './modules/feed/feed.routes';
import nexoRoutes from './modules/nexo/nexo.routes';
import searchRoutes from './modules/search/search.routes';
import socialRoutes from './modules/social/social.routes';
import messagingRoutes from './modules/messaging/messaging.routes';
import moderationRoutes from './modules/moderation/moderation.routes';
import adminRoutes from './modules/admin/admin.routes';
import premiumRoutes from './modules/premium/premium.routes';
import notificationRoutes from './modules/notification/notification.routes';
import analyticsRoutes from './modules/admin/analytics.routes';
import groupRoutes from './modules/groups/group.routes';
import friendRoutes from './modules/friends/friend.routes';
import mangaRoutes from './modules/manga/manga.routes';
import { errorHandler } from './middleware/error.middleware';
import { maintenanceMiddleware } from './middleware/maintenance.middleware';
import { setupSockets } from './sockets';
import { startJobs } from './jobs';
import { logger } from './lib/logger';
import { socketService } from './lib/socketService';

import { sanitizerMiddleware } from './middleware/sanitizer';
import { securityHeaders } from './middleware/securityHeaders';
import { globalLimiter } from './middleware/rateLimiter';
import session from 'express-session';
import passport from 'passport';
import './config/passport.config';

const allowedOrigins = process.env.CLIENT_URL 
  ? process.env.CLIENT_URL.split(',') 
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Inicializar WebSockets
socketService.init(io);
setupSockets(io);

// Middlewares de Seguridad Global
app.use(securityHeaders);
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma'],
  credentials: true
}));
app.use(json({ limit: '10mb' })); 
app.use(urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizerMiddleware);
app.use(morgan('dev'));
app.use(cookieParser());

// Configuración de Sesión para OAuth
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  logger.warn('[Warning]: SESSION_SECRET environment variable is missing! Using default fallback.');
}

app.use(session({
  secret: sessionSecret || 'keyboard_cat_aninexo',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } 
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(globalLimiter);
app.use(maintenanceMiddleware);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'AniNexo Server is running' });
});

// Public Stats Routes
import prisma from './lib/prisma';
app.get('/api/stats/users', async (req, res) => {
  try {
    const count = await prisma.user.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users count' });
  }
});

app.get('/api/stats/animes', async (req, res) => {
  try {
    const count = await prisma.anime.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch animes count' });
  }
});

app.get('/api/roadmap', (req, res) => {
  res.json({ upcoming: [] });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/anime', animeRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/list', listRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/nexo', nexoRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/premium', premiumRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/manga', mangaRoutes);

// ── Image proxy (strips CORS restrictions from external CDNs) ─────────────────
import axios from 'axios';
app.get('/api/proxy/image', async (req, res) => {
  const url = req.query.url as string;
  if (!url || !/^https:\/\/(s\d+\.anilist\.co|cdn\.myanimelist\.net|img\.anili\.st)\//.test(url)) {
    return res.status(400).send('Invalid or disallowed image URL');
  }
  try {
    const upstream = await axios.get(url, {
      responseType: 'stream',
      timeout: 8000,
      headers: { 'User-Agent': 'AniNexo/1.0' }
    });
    res.removeHeader('Access-Control-Allow-Credentials');
    res.set('Content-Type', String(upstream.headers['content-type'] || 'image/jpeg'));
    res.set('Cache-Control', 'public, max-age=86400, immutable');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    upstream.data.pipe(res);
  } catch {
    res.status(502).send('Image fetch failed');
  }
});

app.use(errorHandler);

io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

import { startWorkers } from './workers';
startWorkers();
startJobs();

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = '0.0.0.0';
httpServer.listen(PORT, HOST, () => {
  logger.info(`[server]: Server is running at http://${HOST}:${PORT}`);
});
