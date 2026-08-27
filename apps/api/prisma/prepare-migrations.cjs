const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');

const BASELINE_MIGRATION = '20260827010000_baseline';
const prisma = new PrismaClient();

function runPrisma(args) {
  const executable = path.resolve(__dirname, '../../../node_modules/.bin/prisma');
  const result = spawnSync(executable, args, {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      CHECKPOINT_DISABLE: '1',
      PRISMA_HIDE_UPDATE_MESSAGE: '1',
      PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING: '1',
    },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  return result.status;
}

async function prepareMigrations() {
  const [state] = await prisma.$queryRawUnsafe(`
    SELECT
      to_regclass('public."Institution"') IS NOT NULL AS "hasApplicationSchema",
      to_regclass('public."_prisma_migrations"') IS NOT NULL AS "hasMigrationHistory"
  `);

  if (!state?.hasApplicationSchema || state?.hasMigrationHistory) return;

  console.log('Base de datos existente detectada. Verificando integridad antes de registrar la migración base...');
  const diffStatus = runPrisma([
    'migrate',
    'diff',
    '--from-schema-datasource',
    'prisma/schema.prisma',
    '--to-schema-datamodel',
    'prisma/schema.prisma',
    '--exit-code',
  ]);

  if (diffStatus === 2) {
    throw new Error(
      'La base existente difiere del esquema esperado. Se detuvo el arranque para proteger los datos; revise la diferencia antes de aplicar migraciones.',
    );
  }
  if (diffStatus !== 0) throw new Error('No fue posible verificar el esquema existente antes de migrar.');

  const resolveStatus = runPrisma([
    'migrate',
    'resolve',
    '--applied',
    BASELINE_MIGRATION,
    '--schema',
    'prisma/schema.prisma',
  ]);
  if (resolveStatus !== 0) throw new Error('No fue posible registrar la migración base en la base existente.');

  console.log('Migración base registrada sin modificar los datos existentes.');
}

prepareMigrations()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
