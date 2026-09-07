import knexFactory from 'knex';

export const db = knexFactory({
  client: 'pg',
  connection: process.env.DATABASE_URL ||
    'postgres://seminary:seminary_dev@localhost:5432/seminary',
  pool: { min: 0, max: 10 },
});
