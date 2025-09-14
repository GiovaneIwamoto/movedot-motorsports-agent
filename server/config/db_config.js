const { Pool } = require('pg');

const db = new Pool({
  host: process.env.DATABASE_HOST || "postgress_container",
  user: process.env.DATABASE_USER || "admin",
  password: process.env.DATABASE_PASSWORD || "secret",
  database: process.env.DATABASE_NAME || "mydb",
  port: process.env.DATABASE_PORT || 5432
});

async function connectWithRetry(maxRetries = 10, delayMs = 2000) {
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      await db.query('SELECT 1');
      console.log('✅ Conectado ao Postgres!');
      return;
    } catch (err) {
      attempts++;
      console.log(`⚠️ Tentativa ${attempts} falhou. Retentando em ${delayMs}ms...`);
      await new Promise(res => setTimeout(res, delayMs));
    }
  }
  throw new Error('❌ Não foi possível conectar ao Postgres após várias tentativas.');
}

module.exports = { db, connectWithRetry };