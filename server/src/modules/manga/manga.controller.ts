import { Request, Response, NextFunction } from 'express';
import { MangaService } from './manga.service';

const mangaService = new MangaService();

export class MangaController {
  search = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q, limit, offset } = req.query;
      const query = q as string;
      
      if (!query || query.length < 2) {
        return res.status(200).json({ success: true, data: [] });
      }

      const results = await mangaService.searchManga(
        query,
        limit ? Number(limit) : 20,
        offset ? Number(offset) : 0
      );

      res.status(200).json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  };

  getDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const details = await mangaService.getMangaDetails(id as string);
      res.status(200).json({ success: true, data: details });
    } catch (error) {
      next(error);
    }
  };

  getChapters = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { limit, offset, lang } = req.query;
      const results = await mangaService.getMangaChapters(
        id as string,
        limit ? Number(limit) : 100,
        offset ? Number(offset) : 0,
        lang ? String(lang) : 'es'
      );
      res.status(200).json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  };

  getPages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { chapterId } = req.params;
      const results = await mangaService.getChapterPages(chapterId as string);
      res.status(200).json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  };
}
