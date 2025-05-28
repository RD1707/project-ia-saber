const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        message_count INTEGER DEFAULT 0
      );

      ALTER TABLE conversations
      ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT CHECK(role IN ('user', 'assistant')) NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        ai_settings JSONB
      );
      
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
    `);
    console.log('Banco PostgreSQL pronto');
  } catch (error) {
    console.error('Erro ao inicializar banco:', error);
    throw error;
  }
}

async function registerUser(name, email, password) {
  const id = uuidv4();
  const password_hash = await bcrypt.hash(password, 10);
  await pool.query(`
    INSERT INTO users (id, name, email, password_hash)
    VALUES ($1, $2, $3, $4)
  `, [id, name, email, password_hash]);
  return { id, name, email };
}

async function loginUser(email, password) {
  const res = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  const user = res.rows[0];
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  return { id: user.id, name: user.name, email: user.email };
}

async function createNewConversation(userId, title = 'Nova Conversa') {
  try {
    const id = uuidv4();
    const now = new Date().toISOString();

    await pool.query(`
      INSERT INTO conversations (id, user_id, title, created_at, updated_at, message_count) 
      VALUES ($1, $2, $3, $4, $5, 0)`, 
      [id, userId, title, now, now]
    );

    return { 
      id, 
      title, 
      created_at: now, 
      updated_at: now, 
      message_count: 0 
    };
  } catch (error) {
    console.error('Erro ao criar conversa:', error);
    throw error;
  }
}

async function saveMessage(conversationId, role, content, aiSettings = null) {
  try {
    const now = new Date().toISOString();
    
    await pool.query(`
      INSERT INTO messages (conversation_id, role, content, timestamp, ai_settings) 
      VALUES ($1, $2, $3, $4, $5)`,
      [conversationId, role, content, now, aiSettings ? JSON.stringify(aiSettings) : null]
    );
    
    await pool.query(`
      UPDATE conversations 
      SET updated_at = $1, 
          message_count = (SELECT COUNT(*) FROM messages WHERE conversation_id = $2) 
      WHERE id = $2`, 
      [now, conversationId]
    );
    
  } catch (error) {
    console.error('Erro ao salvar mensagem:', error);
    throw error;
  }
}

async function getConversationMessages(conversationId) {
  try {
    const res = await pool.query(`
      SELECT id, conversation_id, role, content, timestamp, ai_settings 
      FROM messages 
      WHERE conversation_id = $1 
      ORDER BY timestamp ASC`, 
      [conversationId]
    );
    
    return res.rows.map(row => ({
      ...row,
      ai_settings: typeof row.ai_settings === 'string'
        ? JSON.parse(row.ai_settings)
        : row.ai_settings || null
    }));
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    throw error;
  }
}

async function updateConversationTitle(conversationId, newTitle) {
  try {
    const now = new Date().toISOString();
    
    await pool.query(`
      UPDATE conversations 
      SET title = $1, updated_at = $2 
      WHERE id = $3`, 
      [newTitle, now, conversationId]
    );
    
  } catch (error) {
    console.error('Erro ao atualizar título:', error);
    throw error;
  }
}

async function deleteConversation(conversationId) {
  try {
    await pool.query(`DELETE FROM conversations WHERE id = $1`, [conversationId]);
  } catch (error) {
    console.error('Erro ao deletar conversa:', error);
    throw error;
  }
}

async function getChatHistory(userId) {
    try {
        const res = await pool.query(`
            SELECT 
                c.*,
                (SELECT content FROM messages 
                 WHERE conversation_id = c.id 
                 AND role = 'user' 
                 ORDER BY timestamp ASC LIMIT 1) AS first_message 
            FROM conversations c
            WHERE c.user_id = $1
            ORDER BY c.updated_at DESC
        `, [userId]);
        
        return res.rows;
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        throw error;
    }
}

async function clearAllConversations() {
  try {
    // Como há CASCADE, deletar conversations também deleta messages
    await pool.query('DELETE FROM conversations');
    console.log('Todas as conversas foram deletadas');
  } catch (error) {
    console.error('Erro ao limpar conversas:', error);
    throw error;
  }
}

async function closeConnection() {
  try {
    await pool.end();
    console.log('Conexão com banco encerrada');
  } catch (error) {
    console.error('Erro ao fechar conexão:', error);
  }
}

// Função para testar conexão
async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Conexão com banco testada:', res.rows[0].now);
    return true;
  } catch (error) {
    console.error('Erro na conexão com banco:', error);
    return false;
  }
}

module.exports = {
  initializeDatabase,
  createNewConversation,
  saveMessage,
  getConversationMessages,
  updateConversationTitle,
  deleteConversation,
  getChatHistory,
  clearAllConversations,
  closeConnection,
  testConnection,
  pool,
  registerUser,
  loginUser
};
