import prisma from '../../lib/prisma';
import axios from 'axios';
import { addJob, QUEUES } from '../../lib/queue';
import { logger } from '../../lib/logger';
import { translateText } from '../../lib/translate';

const ANILIST_URL = 'https://graphql.anilist.co';
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


export class AnimeService {
  /**
   * Obtiene un anime por ID con persistencia progresiva o forzada.
   */
  async getAnimeById(id: number, forceSync: boolean = false) {
    try {
      const anime = await prisma.anime.findUnique({
        where: { id },
        include: {
          characters: { include: { character: true } },
          genres: true,
          studios: true
        }
      });

      if (forceSync || !anime || !anime.isComplete || !anime.relationsData || !anime.staffData || !anime.statsData) {
        logger.info(`[AnimeService]: Sincronización ${forceSync ? 'FORZADA' : 'INCOMPLETA'} para ID ${id}...`);
        return await this.syncWithExternal(id, forceSync);
      }

      const isStale = new Date().getTime() - anime.lastSyncAt.getTime() > 24 * 60 * 60 * 1000;
      if (isStale) {
        logger.info(`[AnimeService]: Anime ${id} está desactualizado. Encolando sincronización...`);
        await addJob(QUEUES.ANIME_SYNC, 'sync-anime', { animeId: id });
      }

      return anime;
    } catch (error) {
      console.error(`[AnimeService Error] en getAnimeById(${id}):`, error);
      return await this.syncWithExternal(id);
    }
  }

  async syncWithExternal(id: number, forceSync: boolean = false) {
    let allCharacters = [];
    let allStaff = [];
    let hasNextPageChar = true;
    let hasNextPageStaff = true;
    let pageChar = 1;
    let pageStaff = 1;
    let baseData: any = null;

    try {
      console.log(`[Sync] Iniciando descarga exhaustiva ${forceSync ? '(FORZADA)' : ''} para ID ${id}...`);

      if (forceSync) {
        console.log(`[Sync] Limpiando personajes previos para ID ${id}...`);
        await prisma.characterOnAnime.deleteMany({ where: { animeId: id } });
      }

      // 1. OBTENER DATOS BASE Y PRIMERAS PÁGINAS
      const query = `
        query ($id: Int, $pageChar: Int, $pageStaff: Int) {
          Media (id: $id, type: ANIME) {
            id
            title { romaji english native }
            description
            type status episodes duration season seasonYear averageScore popularity
            coverImage { extraLarge }
            bannerImage
            genres
            tags { name description category rank isGeneralSpoiler isMediaSpoiler }
            source
            synonyms
            trailer { id site }
            studios(isMain: true) { nodes { id name } }
            characters(sort: [ROLE, RELEVANCE], perPage: 50, page: $pageChar) {
              pageInfo { hasNextPage }
              edges {
                role
                node { id name { full } image { large } description }
                voiceActors(language: JAPANESE, sort: [RELEVANCE]) {
                  id name { full } image { large }
                }
              }
            }
            relations {
              nodes { id type status title { romaji english } coverImage { large } }
            }
            recommendations(perPage: 20, sort: [RATING_DESC]) {
              nodes {
                mediaRecommendation { id title { romaji english } coverImage { large } averageScore }
              }
            }
            staff(perPage: 50, page: $pageStaff) {
              pageInfo { hasNextPage }
              nodes { id name { full } image { large } primaryOccupations }
            }
            stats {
              scoreDistribution { score amount }
              statusDistribution { status amount }
            }
            externalLinks { site url icon }
          }
        }
      `;

      const response = await axios.post(ANILIST_URL, { query, variables: { id, pageChar, pageStaff } });
      baseData = response.data.data.Media;
      if (!baseData) throw new Error('Anime no encontrado en AniList');

      // Guardar primera tanda
      allCharacters = baseData.characters?.edges || [];
      allStaff = baseData.staff?.nodes || [];
      hasNextPageChar = baseData.characters?.pageInfo?.hasNextPage;
      hasNextPageStaff = baseData.staff?.pageInfo?.hasNextPage;

      // 2. BUCLE PARA PERSONAJES RESTANTES
      while (hasNextPageChar) { 
        pageChar++;
        console.log(`[Sync] Descargando página ${pageChar} de personajes...`);
        const charRes = await axios.post(ANILIST_URL, {
          query: `query($id: Int, $page: Int){ Media(id:$id){ characters(perPage:50, page:$page){ pageInfo{hasNextPage} edges{ role node{ id name{full} image{large} description } voiceActors(language: JAPANESE, sort: [RELEVANCE]) { id name { full } image { large } } } } } }`,
          variables: { id, page: pageChar }
        });
        const newChars = charRes.data.data.Media.characters.edges || [];
        allCharacters = [...allCharacters, ...newChars];
        hasNextPageChar = charRes.data.data.Media.characters.pageInfo.hasNextPage;
        await sleep(500); // Evitar 429
      }

      // 3. BUCLE PARA STAFF RESTANTE
      while (hasNextPageStaff) {
        pageStaff++;
        console.log(`[Sync] Descargando página ${pageStaff} de staff...`);
        const staffRes = await axios.post(ANILIST_URL, {
          query: `query($id: Int, $page: Int){ Media(id:$id){ staff(perPage:50, page:$page){ pageInfo{hasNextPage} nodes{ id name{full} image{large} primaryOccupations } } } }`,
          variables: { id, page: pageStaff }
        });
        const newStaff = staffRes.data.data.Media.staff.nodes || [];
        allStaff = [...allStaff, ...newStaff];
        hasNextPageStaff = staffRes.data.data.Media.staff.pageInfo.hasNextPage;
        await sleep(500); // Evitar 429
      }

      // Traducir sinopsis
      const descriptionTranslated = await translateText(baseData.description);

      // Traducir tags si existen
      if (baseData.tags) {
        for (const t of baseData.tags) {
          if (t.description) {
            t.description = await translateText(t.description);
          }
        }
      }

      const titleStr = baseData.title.english || baseData.title.romaji;
      const slug = `${baseData.id}-${titleStr.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

      const anime = await prisma.anime.upsert({
        where: { id: baseData.id },
        update: {
          slug, titleRomaji: baseData.title.romaji, titleEnglish: baseData.title.english, titleNative: baseData.title.native,
          description: descriptionTranslated, type: baseData.type, status: baseData.status, episodes: baseData.episodes,
          duration: baseData.duration, season: baseData.season, seasonYear: baseData.seasonYear, averageScore: baseData.averageScore,
          popularity: baseData.popularity, coverImage: baseData.coverImage.extraLarge, bannerImage: baseData.bannerImage,
          trailerYoutubeId: baseData.trailer?.site === 'youtube' ? baseData.trailer.id : null,
          relationsData: baseData.relations?.nodes || [], 
          recommendationsData: baseData.recommendations?.nodes?.map((r: any) => r.mediaRecommendation) || [], 
          staffData: allStaff, 
          statsData: baseData.stats || {}, 
          externalLinksData: baseData.externalLinks || [], 
          tagsData: baseData.tags || [],
          lastSyncAt: new Date(), isComplete: true
        },
        create: {
          id: baseData.id, slug, titleRomaji: baseData.title.romaji, titleEnglish: baseData.title.english, titleNative: baseData.title.native,
          description: descriptionTranslated, type: baseData.type, status: baseData.status, episodes: baseData.episodes,
          duration: baseData.duration, season: baseData.season, seasonYear: baseData.seasonYear, averageScore: baseData.averageScore,
          popularity: baseData.popularity, coverImage: baseData.coverImage.extraLarge, bannerImage: baseData.bannerImage,
          trailerYoutubeId: baseData.trailer?.site === 'youtube' ? baseData.trailer.id : null,
          relationsData: baseData.relations?.nodes || [], 
          recommendationsData: baseData.recommendations?.nodes?.map((r: any) => r.mediaRecommendation) || [], 
          staffData: allStaff, 
          statsData: baseData.stats || {}, 
          externalLinksData: baseData.externalLinks || [], 
          tagsData: baseData.tags || [],
          lastSyncAt: new Date(), isComplete: true
        }
      });

      // Sincronización robusta de Géneros
      if (baseData.genres) {
        for (const genreName of baseData.genres) {
          try {
            await prisma.genre.upsert({ where: { name: genreName }, update: {}, create: { name: genreName } });
            await prisma.anime.update({ where: { id: anime.id }, data: { genres: { connect: { name: genreName } } } });
          } catch (e: any) {
            logger.error(`[AnimeService] Error vinculando género ${genreName}: ${e.message}`);
          }
        }
      }

      // Sincronización robusta de Estudios
      if (baseData.studios?.nodes) {
        for (const studio of baseData.studios.nodes) {
          try {
            await prisma.studio.upsert({ where: { name: studio.name }, update: {}, create: { name: studio.name } });
            await prisma.anime.update({ where: { id: anime.id }, data: { studios: { connect: { name: studio.name } } } });
          } catch (e: any) {
            logger.error(`[AnimeService] Error vinculando estudio ${studio.name}: ${e.message}`);
          }
        }
      }

      // 4. GUARDAR TODOS LOS PERSONAJES
      for (const edge of allCharacters) {
        const char = edge.node;
        try {
          const charDescTranslated = await translateText(char.description);
          await prisma.character.upsert({
            where: { id: char.id },
            update: { name: char.name.full, image: char.image.large, description: charDescTranslated },
            create: { id: char.id, name: char.name.full, image: char.image.large, description: charDescTranslated }
          });
          await prisma.characterOnAnime.upsert({
            where: { animeId_characterId: { animeId: anime.id, characterId: char.id } },
            update: { role: edge.role, voiceActorsData: edge.voiceActors || [] },
            create: { animeId: anime.id, characterId: char.id, role: edge.role, voiceActorsData: edge.voiceActors || [] }
          });
        } catch (e: any) {
          logger.error(`[AnimeService] Error vinculando personaje ${char.id}: ${e.message}`);
        }
      }

      console.log(`[Sync] Éxito total para ${anime.titleRomaji}`);
      return await prisma.anime.findUnique({
        where: { id: anime.id },
        include: { genres: true, studios: true, characters: { include: { character: true } } }
      });
    } catch (error: any) {
      if (error.response?.data) {
        console.error(`[Sync FATAL ERROR] ID ${id} - Detalle API:`, JSON.stringify(error.response.data, null, 2));
      } else {
        console.error(`[Sync FATAL ERROR] ID ${id}:`, error.message);
      }
      throw new Error(`Error en la Dimensión Nexo al procesar el anime ${id}.`);
    }
  }

  async searchExternal(search: string) {
    const query = `
      query ($search: String) {
        Page(perPage: 5) {
          media(search: $search, type: ANIME) {
            id
            title { romaji english native }
            coverImage { extraLarge }
            format
            averageScore
          }
        }
      }
    `;

    try {
      const response = await axios.post(ANILIST_URL, { query, variables: { search } });
      const media = response.data.data.Page.media;

      if (!media || media.length === 0) return [];

      // Guardado rápido de resultados para persistencia progresiva
      const savedAnimes = [];
      for (const item of media) {
        const titleStr = item.title.english || item.title.romaji;
        const slug = `${item.id}-${titleStr.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
        
        const anime = await prisma.anime.upsert({
          where: { id: item.id },
          update: {}, // No sobreescribir si ya existe, solo queremos asegurar que esté
          create: {
            id: item.id,
            slug,
            titleRomaji: item.title.romaji,
            titleEnglish: item.title.english,
            titleNative: item.title.native,
            coverImage: item.coverImage.extraLarge,
            type: item.format, // Mapeamos format a type que sí existe en el esquema
            averageScore: item.averageScore,
            isComplete: false 
          }
        });
        savedAnimes.push(anime);
      }

      return savedAnimes;
    } catch (error) {
      logger.error(`[AnimeService] Error en búsqueda externa: ${error}`);
      return [];
    }
  }

  async searchExternalCharacters(search: string) {
    const query = `
      query ($search: String) {
        Page(perPage: 5) {
          characters(search: $search) {
            id
            name { full }
            image { large }
          }
        }
      }
    `;

    try {
      const response = await axios.post(ANILIST_URL, { query, variables: { search } });
      return response.data.data.Page.characters || [];
    } catch (error) {
      logger.error(`[AnimeService] Error en búsqueda de personajes: ${error}`);
      return [];
    }
  }
}
