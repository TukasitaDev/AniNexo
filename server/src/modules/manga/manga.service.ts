import axios from 'axios';
import { logger } from '../../lib/logger';

const MANGADEX_API_URL = 'https://api.mangadex.org';
const MANGADEX_DOWNLOADS_URL = 'https://uploads.mangadex.org';

export class MangaService {
  /**
   * Busca mangas en MangaDex.
   */
  async searchManga(query: string, limit: number = 20, offset: number = 0) {
    try {
      logger.info(`[MangaService] Buscando manga en MangaDex para: "${query}" (limit=${limit}, offset=${offset})`);
      const response = await axios.get(`${MANGADEX_API_URL}/manga`, {
        params: {
          title: query,
          limit,
          offset,
          includes: ['cover_art', 'author', 'artist'],
          contentRating: ['safe', 'suggestive'],
        },
      });

      if (!response.data || !response.data.data) {
        return [];
      }

      return response.data.data.map((manga: any) => this.normalizeManga(manga));
    } catch (error: any) {
      logger.error(`[MangaService Search Error]: ${error.message}`);
      return [];
    }
  }

  /**
   * Obtiene detalles de un manga específico.
   */
  async getMangaDetails(mangaId: string) {
    try {
      logger.info(`[MangaService] Obteniendo detalles para manga: ${mangaId}`);
      const response = await axios.get(`${MANGADEX_API_URL}/manga/${mangaId}`, {
        params: {
          includes: ['cover_art', 'author', 'artist'],
        },
      });

      if (!response.data || !response.data.data) {
        throw new Error('Manga no encontrado');
      }

      return this.normalizeManga(response.data.data);
    } catch (error: any) {
      logger.error(`[MangaService Details Error]: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene el listado de capítulos para un manga.
   */
  async getMangaChapters(mangaId: string, limit: number = 100, offset: number = 0, lang: string = 'es') {
    try {
      logger.info(`[MangaService] Obteniendo capítulos de manga: ${mangaId} (lang=${lang}, limit=${limit})`);
      
      // Consultamos los capítulos con filtro de idioma
      let response = await axios.get(`${MANGADEX_API_URL}/manga/${mangaId}/feed`, {
        params: {
          limit,
          offset,
          translatedLanguage: [lang, 'es-la'],
          order: { chapter: 'asc' },
          includes: ['scanlation_group'],
        },
      });

      // Si no hay capítulos en español, intentamos en inglés como fallback
      if ((!response.data || response.data.data.length === 0) && lang !== 'en') {
        logger.info(`[MangaService] Sin capítulos en español para ${mangaId}. Usando inglés de fallback.`);
        response = await axios.get(`${MANGADEX_API_URL}/manga/${mangaId}/feed`, {
          params: {
            limit,
            offset,
            translatedLanguage: ['en'],
            order: { chapter: 'asc' },
            includes: ['scanlation_group'],
          },
        });
      }

      if (!response.data || !response.data.data) {
        return { chapters: [], total: 0 };
      }

      const chapters = response.data.data.map((ch: any) => {
        const groupRel = ch.relationships.find((r: any) => r.type === 'scanlation_group');
        return {
          id: ch.id,
          title: ch.attributes.title || '',
          chapter: ch.attributes.chapter || '0',
          volume: ch.attributes.volume || '',
          pages: ch.attributes.pages,
          language: ch.attributes.translatedLanguage,
          scanGroup: groupRel ? groupRel.attributes?.name || 'Unknown Group' : 'MangaDex Direct',
          publishAt: ch.attributes.publishAt,
        };
      });

      return {
        chapters,
        total: response.data.total || chapters.length,
      };
    } catch (error: any) {
      logger.error(`[MangaService Chapters Error]: ${error.message}`);
      return { chapters: [], total: 0 };
    }
  }

  /**
   * Obtiene la URL de las páginas de un capítulo específico.
   */
  async getChapterPages(chapterId: string) {
    try {
      logger.info(`[MangaService] Obteniendo páginas del capítulo: ${chapterId}`);
      const response = await axios.get(`${MANGADEX_API_URL}/at-home/server/${chapterId}`);
      if (!response.data || !response.data.chapter) {
        throw new Error('No se pudieron recuperar las páginas');
      }

      const { baseUrl, chapter } = response.data;
      const { hash, data: files } = chapter;

      // Generamos las URLs absolutas para las páginas del capítulo
      const pages = files.map((filename: string) => `${baseUrl}/data/${hash}/${filename}`);

      return {
        hash,
        pages,
      };
    } catch (error: any) {
      logger.error(`[MangaService Pages Error]: ${error.message}`);
      throw error;
    }
  }

  /**
   * Normaliza los datos que vienen de la API de MangaDex.
   */
  private normalizeManga(manga: any) {
    const { id, attributes, relationships } = manga;
    
    // Buscar relaciones
    const coverRel = relationships.find((r: any) => r.type === 'cover_art');
    const authorRel = relationships.find((r: any) => r.type === 'author');
    const artistRel = relationships.find((r: any) => r.type === 'artist');

    const coverFileName = coverRel ? coverRel.attributes?.fileName : null;
    const coverUrl = coverFileName 
      ? `${MANGADEX_DOWNLOADS_URL}/covers/${id}/${coverFileName}`
      : 'https://placehold.co/400x600/090909/00E5FF?text=No+Cover';

    const titleMap = attributes.title || {};
    const title = titleMap.en || titleMap.ja || Object.values(titleMap)[0] || 'Untitled Manga';
    
    // Sinopsis en español si existe, fallback a inglés
    const descMap = attributes.description || {};
    const description = descMap.es || descMap['es-la'] || descMap.en || Object.values(descMap)[0] || 'Sin descripción disponible.';

    return {
      id,
      title,
      description,
      status: attributes.status,
      year: attributes.year,
      coverUrl,
      author: authorRel ? authorRel.attributes?.name : 'Desconocido',
      artist: artistRel ? artistRel.attributes?.name : 'Desconocido',
      tags: (attributes.tags || []).map((t: any) => t.attributes?.name?.es || t.attributes?.name?.en).filter(Boolean),
    };
  }
}
