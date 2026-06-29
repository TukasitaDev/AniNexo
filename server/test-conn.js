require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function test() {
  console.log('Probando DIRECT_URL (puerto 5432, sin PgBouncer)...');
  console.log('URL:', process.env.DIRECT_URL?.replace(/:[^:@]+@/, ':***@'));

  const p = new PrismaClient({
    datasourceUrl: process.env.DIRECT_URL + '?connection_limit=5',
    log: ['error'],
  });

  try {
    const start = Date.now();
    const result = await p.$queryRawUnsafe('SELECT 1 as ok');
    console.log(`CONEXION DIRECTA OK en ${Date.now() - start}ms:`, result);
  } catch (e) {
    console.error('ERROR DIRECTA:', e.message);
  }

  console.log('\nProbando DATABASE_URL (puerto 6543, PgBouncer)...');
  console.log('URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));

  const p2 = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
    log: ['error'],
  });

  try {
    const start = Date.now();
    const result = await p2.$queryRawUnsafe('SELECT 1 as ok');
    console.log(`CONEXION POOLER OK en ${Date.now() - start}ms:`, result);
  } catch (e) {
    console.error('ERROR POOLER:', e.message?.split('\n')[0]);
  }

  await p.$disconnect();
  await p2.$disconnect();
  process.exit(0);
}

test();
