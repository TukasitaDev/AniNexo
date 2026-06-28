import { Request, Response, NextFunction } from 'express';
import { DiscoveryService } from './discovery.service';
import { MangaService } from '../manga/manga.service';

const mangaService = new MangaService();

export class DiscoveryController {
  private discoveryService: DiscoveryService;

  constructor() {
    this.discoveryService = new DiscoveryService();
  }

  getHomeData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;

      const [hero, rows, personalized, popularMangas, newMangas, actionMangas, romanceMangas] = await Promise.all([
        this.discoveryService.getHeroSlides(),
        this.discoveryService.getHomeRows(),
        userId ? this.discoveryService.getPersonalizedData(userId as string) : Promise.resolve([]),
        mangaService.searchManga('one', 12, 0), // Use generic keyword to load popular mangas
        mangaService.searchManga('a', 12, 10), // Alternate query for fresh mangas
        mangaService.searchManga('battle', 12, 0), // Action/Battle mangas
        mangaService.searchManga('love', 12, 0) // Romance/Love mangas
      ]);

      const mangaRows = [
        { title: '📖 Mangas Más Populares', isManga: true, data: popularMangas },
        { title: '✨ Nuevos Mangas', isManga: true, data: newMangas },
        { title: '⚔️ Mangas de Acción & Aventura', isManga: true, data: actionMangas },
        { title: '🌸 Mangas de Romance & Drama', isManga: true, data: romanceMangas }
      ];

      res.status(200).json({
        success: true,
        data: { 
          hero, 
          rows: [...personalized, ...rows, ...mangaRows] 
        }
      });
    } catch (error) {
      next(error);
    }
  };

  getByGenre = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { genre } = req.params;
      const page = Number(req.query.page) || 1;
      const perPage = Number(req.query.perPage) || 50;
      
      const data = await this.discoveryService.getByGenre(genre as string, page, perPage);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  getByCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { category } = req.params;
      const page = Number(req.query.page) || 1;
      const perPage = Number(req.query.perPage) || 50;

      const data = await this.discoveryService.getByCategory(category as string, page, perPage);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  advancedSearch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = req.query;
      const page = Number(req.query.page) || 1;
      const perPage = Number(req.query.perPage) || 50;

      // Convertir géneros de string a array si es necesario
      if (typeof filters.genres === 'string') {
        filters.genres = filters.genres.split(',');
      }

      const data = await this.discoveryService.advancedSearch(filters, page, perPage);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  trackView = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { animeId } = req.body;
      const userId = (req as any).user?.id;
      
      if (userId && animeId) {
        await this.discoveryService.trackView(userId as string, Number(animeId));
      }

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /anime/discovery/nexus
   * Devuelve AnimeNode[] para el Nexus Engine (hexagonal hive).
   * Cacheado en memoria 10 min. Sin autenticación requerida.
   */
  getNexusData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const nodes = await this.discoveryService.getNexusData();
      // Cabecera de caché HTTP para el browser/CDN
      res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      res.status(200).json({ success: true, data: nodes });
    } catch (error) {
      next(error);
    }
  };
}
