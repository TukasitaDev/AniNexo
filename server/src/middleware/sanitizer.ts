import { Request, Response, NextFunction } from 'express';

/**
 * Sanitizador ligero sin dependencias externas.
 * Elimina tags HTML, atributos peligrosos e inyecciones de script.
 * Compatible con CommonJS / ts-node sin problemas de ESM.
 */
const sanitizeString = (input: string): string => {
  return input
    // Eliminar tags de script completos con contenido
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    // Eliminar tags de style completos
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    // Eliminar eventos inline (onclick, onload, etc.)
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Eliminar href y src con javascript:
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '')
    .replace(/src\s*=\s*["']javascript:[^"']*["']/gi, '')
    // Eliminar todos los tags HTML restantes
    .replace(/<[^>]+>/g, '')
    .trim();
};

const sanitize = (data: any): any => {
  if (typeof data === 'string') {
    return sanitizeString(data);
  }
  if (Array.isArray(data)) {
    return data.map(v => sanitize(v));
  }
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const key in data) {
      sanitized[key] = sanitize(data[key]);
    }
    return sanitized;
  }
  return data;
};

export const sanitizerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip deep sanitization for message content (can contain base64 images/audio)
  const isMessagingSend = req.path === '/send' && req.baseUrl?.includes('messaging');

  const sanitizeInPlace = (obj: any, skipKeys: string[] = []) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key in obj) {
      if (skipKeys.includes(key)) continue;
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object') {
        sanitizeInPlace(obj[key], skipKeys);
      }
    }
  };

  if (req.body) sanitizeInPlace(req.body, isMessagingSend ? ['content'] : []);
  if (req.query) sanitizeInPlace(req.query);
  if (req.params) sanitizeInPlace(req.params);

  next();
};
