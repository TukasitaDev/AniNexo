import axios from 'axios';
import { logger } from './logger';

/**
 * Traduce texto de inglés a español usando el endpoint público de Google Translate.
 * Cuenta con un manejo robusto de errores y fallback al texto original si falla.
 */
export async function translateText(text: string | null | undefined): Promise<string> {
  if (!text) return '';
  
  // Limpiar espacios extras
  const queryText = text.trim();
  if (!queryText) return '';

  try {
    const url = `https://translate.googleapis.com/translate_a/single`;
    const response = await axios.get(url, {
      params: {
        client: 'gtx',
        sl: 'en',
        tl: 'es',
        dt: 't',
        q: queryText
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 5000 // 5 segundos max
    });

    if (response.data && response.data[0]) {
      // Google devuelve un array de chunks. Los unimos todos.
      const translatedChunks = response.data[0].map((chunk: any) => chunk[0] || '');
      return translatedChunks.join('');
    }

    return text;
  } catch (error: any) {
    logger.error(`[Translate Error] No se pudo traducir el texto. Usando original. Detalle: ${error.message}`);
    return text;
  }
}
