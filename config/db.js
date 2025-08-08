// config/db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20, // Aumenta o limite de conexões
  idleTimeoutMillis: 30000, // Fecha clientes ociosos após 30s
  connectionTimeoutMillis: 2000, // Tempo de espera para conectar
});

pool.on('error', (err, client) => {
  console.error('Erro inesperado no cliente ocioso do pool', err);
  process.exit(-1);
});

// Função para testar a conexão e tentar reconectar
const connectWithRetry = async () => {
  try {
    const client = await pool.connect();
    console.log('Conectado ao PostgreSQL com sucesso!');
    client.release();
  } catch (err) {
    console.error('Falha ao conectar ao PostgreSQL, tentando novamente em 5 segundos...', err);
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};