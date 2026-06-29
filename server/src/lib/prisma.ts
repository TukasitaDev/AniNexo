process.env.DIRECT_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;

import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Usar DIRECT_URL (puerto 5432, sin PgBouncer) para el runtime.
// PgBouncer (puerto 6543) en Transaction mode de Supabase causa ECHECKOUTTIMEOUT.
// Para un servidor Node.js de larga duración, la conexión directa es la correcta.
// DATABASE_URL (pooler) se reserva solo para migraciones vía prisma.config.ts.
const runtimeUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
const datasourceUrl = runtimeUrl.includes('connection_limit')
  ? runtimeUrl
  : runtimeUrl + (runtimeUrl.includes('?') ? '&' : '?') + 'connection_limit=5';

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['warn', 'error'],
    datasourceUrl,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;


