import { Request, Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { AnimeService } from '../anime/anime.service';
import { MangaService } from '../manga/manga.service';

const animeService = new AnimeService();
const mangaService = new MangaService();

export class SearchController {
  globalSearch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q } = req.query;
      const query = q as string;

      if (!query || query.length < 2) {
        return res.status(200).json({ success: true, data: { animes: [], users: [], mangas: [] } });
      }

      console.log(`[SearchController] Buscando localmente (case-insensitive): "${query}"`);
      // 1. Buscar Animes Locales
      let animes = await prisma.anime.findMany({
        where: {
          OR: [
            { titleRomaji: { contains: query, mode: 'insensitive' } },
            { titleEnglish: { contains: query, mode: 'insensitive' } },
            { titleNative: { contains: query, mode: 'insensitive' } }
          ]
        },
        take: 5,
        select: {
          id: true,
          titleRomaji: true,
          titleEnglish: true,
          coverImage: true,
          type: true,
          averageScore: true
        }
      });

      // 1.5 Activación modo Híbrido (Si hay menos de 5 resultados locales, buscar API)
      if (animes.length < 5) {
        console.log(`[SearchController] Pocos resultados locales (${animes.length}). Activando búsqueda externa para: "${query}"`);
        await animeService.searchExternal(query);

        // Query again to get updated results (now including the synced external ones)
        animes = await prisma.anime.findMany({
          where: {
            OR: [
              { titleRomaji: { contains: query, mode: 'insensitive' } },
              { titleEnglish: { contains: query, mode: 'insensitive' } },
              { titleNative: { contains: query, mode: 'insensitive' } }
            ]
          },
          take: 5,
          select: {
            id: true,
            titleRomaji: true,
            titleEnglish: true,
            coverImage: true,
            type: true,
            averageScore: true
          }
        });
      }

      // 2. Buscar Usuarios (Personas)
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } }
          ]
        },
        take: 5,
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          isPremium: true,
          archetype: true
        }
      });

      // 3. Buscar Mangas en MangaDex
      let mangas: any[] = [];
      try {
        mangas = await mangaService.searchManga(query, 5, 0);
      } catch (err) {
        console.error('[SearchController - MangaDex Error]:', err);
      }

      console.log(`[SearchController] Resultados para "${query}": ${animes.length} animes, ${users.length} usuarios, ${mangas.length} mangas`);

      // Normalizar respuesta para el frontend
      const normalizedAnimes = animes.map(a => {
        const title = a.titleEnglish || a.titleRomaji;
        console.log(`[Search] Resultado: ID=${a.id}, Título="${title}"`);
        return {
          id: a.id,
          title: title,
          coverImage: a.coverImage,
          type: a.type,
          meanScore: a.averageScore
        };
      });

      res.status(200).json({
        success: true,
        data: {
          animes: normalizedAnimes,
          users,
          mangas
        }
      });
    } catch (error) {
      console.error('[SearchController Error]:', error);
      next(error);
    }
  };

  searchCharacters = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q } = req.query;
      const query = q as string;
      if (!query || query.length < 2) return res.json({ success: true, data: [] });

      const characters = await animeService.searchExternalCharacters(query);
      res.status(200).json({ success: true, data: characters });
    } catch (error) {
      next(error);
    }
  };
}
