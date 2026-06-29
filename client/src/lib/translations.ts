/**
 * Traducciones de valores de API al español.
 * AniList y MangaDex devuelven enums y campos en inglés.
 */

// ── Estado del anime / manga ───────────────────────────────────────────────
const STATUS_MAP: Record<string, string> = {
  FINISHED:         'Finalizado',
  RELEASING:        'En emisión',
  NOT_YET_RELEASED: 'Próximamente',
  CANCELLED:        'Cancelado',
  HIATUS:           'En pausa',
  // MangaDex
  ongoing:    'En curso',
  completed:  'Completado',
  hiatus:     'En pausa',
  cancelled:  'Cancelado',
};

// ── Temporada ──────────────────────────────────────────────────────────────
const SEASON_MAP: Record<string, string> = {
  WINTER: 'Invierno',
  SPRING: 'Primavera',
  SUMMER: 'Verano',
  FALL:   'Otoño',
};

// ── Formato / Tipo ─────────────────────────────────────────────────────────
const FORMAT_MAP: Record<string, string> = {
  TV:         'Serie TV',
  TV_SHORT:   'Serie TV Corta',
  MOVIE:      'Película',
  SPECIAL:    'Especial',
  OVA:        'OVA',
  ONA:        'ONA',
  MUSIC:      'Video Musical',
  MANGA:      'Manga',
  NOVEL:      'Novela',
  ONE_SHOT:   'One-Shot',
};

// ── Fuente / Adaptación ────────────────────────────────────────────────────
const SOURCE_MAP: Record<string, string> = {
  ORIGINAL:           'Original',
  MANGA:              'Manga',
  LIGHT_NOVEL:        'Novela Ligera',
  VISUAL_NOVEL:       'Novela Visual',
  VIDEO_GAME:         'Videojuego',
  OTHER:              'Otro',
  NOVEL:              'Novela',
  DOUJINSHI:          'Doujinshi',
  ANIME:              'Anime',
  WEB_NOVEL:          'Novela Web',
  LIVE_ACTION:        'Acción Real',
  GAME:               'Juego',
  COMIC:              'Cómic',
  MULTIMEDIA_PROJECT: 'Proyecto Multimedia',
  PICTURE_BOOK:       'Libro Ilustrado',
};

// ── Géneros (AniList los devuelve en inglés) ───────────────────────────────
const GENRE_MAP: Record<string, string> = {
  'Action':          'Acción',
  'Adventure':       'Aventura',
  'Comedy':          'Comedia',
  'Drama':           'Drama',
  'Ecchi':           'Ecchi',
  'Fantasy':         'Fantasía',
  'Horror':          'Terror',
  'Mahou Shoujo':    'Mahou Shoujo',
  'Mecha':           'Mecha',
  'Music':           'Música',
  'Mystery':         'Misterio',
  'Psychological':   'Psicológico',
  'Romance':         'Romance',
  'Sci-Fi':          'Ciencia Ficción',
  'Slice of Life':   'Recortes de Vida',
  'Sports':          'Deportes',
  'Supernatural':    'Sobrenatural',
  'Thriller':        'Suspenso',
  'Hentai':          'Hentai',
};

// ── Rol de personajes ──────────────────────────────────────────────────────
const ROLE_MAP: Record<string, string> = {
  MAIN:       'Principal',
  SUPPORTING: 'Secundario',
  BACKGROUND: 'Fondo',
};

// ── Exports ────────────────────────────────────────────────────────────────
export const translateStatus  = (v?: string) => (v && STATUS_MAP[v])  || v || '—';
export const translateSeason  = (v?: string) => (v && SEASON_MAP[v])  || v || '—';
export const translateFormat  = (v?: string) => (v && FORMAT_MAP[v])  || v || '—';
export const translateSource  = (v?: string) => (v && SOURCE_MAP[v])  || v || '—';
export const translateGenre   = (v?: string) => (v && GENRE_MAP[v])   || v || v || '';
export const translateRole    = (v?: string) => (v && ROLE_MAP[v])    || v || '—';

// ── Estado de lista del usuario (mi lista) ────────────────────────────────
const LIST_STATUS_MAP: Record<string, string> = {
  WATCHING:    'Viendo',
  COMPLETED:   'Completado',
  PAUSED:      'Pausado',
  DROPPED:     'Abandonado',
  PLANNING:    'Planeando ver',
  REWATCHING:  'Reviendo',
  // snake_case variants
  PLAN_TO_WATCH: 'Planeando ver',
  ON_HOLD:       'En pausa',
};

export const translateListStatus = (v?: string) =>
  (v && LIST_STATUS_MAP[v.toUpperCase().replace(/ /g, '_')]) || (v?.replace(/_/g, ' ') ?? '—');

/** Limpia el HTML que devuelve AniList en las descripciones */
export function stripHtml(html?: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}
