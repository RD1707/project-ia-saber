const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { CohereClient } = require('cohere-ai');
const db = require('./db');
const jwt = require('jsonwebtoken');



const app = express();
const PORT = 3000;

db.initializeDatabase().catch(console.error);

app.use(cors());
app.use(express.json());

// Adicione após a definição do app
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Acesso não autorizado' });
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });
        req.user = user;
        next();
    });
}

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

const DEFAULT_AI_SETTINGS = {
    temperature: 0.5,
    maxTokens: 300,
    personality: 'balanced',
    contextMemory: 10
};

const PERSONALITY_PROMPTS = {
    balanced: 'Você é equilibrado, claro e educativo. Responda de forma direta mas amigável.',
    friendly: 'Você é muito amigável, caloroso e encorajador. Use uma linguagem acolhedora e empática.',
    professional: 'Você é formal, preciso e objetivo. Mantenha um tom profissional e técnico.',
    creative: 'Você é criativo, inovador e inspirador. Use analogias e exemplos criativos.',
    technical: 'Você é altamente técnico e detalhista. Forneça explicações profundas e precisas.'
};

async function generateChatTitle(firstMessage, aiSettings = DEFAULT_AI_SETTINGS) {
    try {
        const titlePrompt = `
Analise a seguinte mensagem de um aluno e crie um título curto e descritivo (máximo 40 caracteres) que capture o tema principal:

Mensagem: "${firstMessage}"

Crie um título objetivo.

Responda APENAS com o título, sem aspas ou explicações:`;

        const response = await cohere.generate({
            model: 'command-r-plus',
            prompt: titlePrompt,
            maxTokens: 15,
            temperature: Math.min(aiSettings.temperature || 0.3, 0.5),
            stopSequences: ['\n', '"', "'"],
        });

        let generatedTitle = response.generations[0].text.trim();
        generatedTitle = generatedTitle.replace(/["']/g, '').substring(0, 40);
        
        if (!generatedTitle || generatedTitle.length < 3) {
            const words = firstMessage.split(' ').slice(0, 6).join(' ');
            generatedTitle = words.substring(0, 40) + (words.length > 40 ? '...' : '');
        }
        
        return generatedTitle;
        
    } catch (error) {
        console.error('Erro ao gerar título:', error);
        const words = firstMessage.split(' ').slice(0, 6).join(' ');
        return words.substring(0, 40) + (words.length > 40 ? '...' : '');
    }
}

function buildPersonalityPrompt(personality, basePrompt) {
    const personalityAddition = PERSONALITY_PROMPTS[personality] || PERSONALITY_PROMPTS.balanced;
    
    return `${basePrompt}

PERSONALIDADE: ${personalityAddition}

Lembre-se de sempre manter o foco educacional e adaptar sua resposta ao nível do aluno.`;
}

function filterContextHistory(messages, contextMemory) {
    const maxMessages = parseInt(contextMemory) || 10;
    const recentMessages = messages.slice(-maxMessages);
    
    console.log(`💭 Usando ${recentMessages.length} mensagens de contexto (limite: ${maxMessages})`);
    
    return recentMessages;
}

app.use(express.static(path.join(__dirname, 'static')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const user = await db.registerUser(name, email, password);
    res.status(201).json({ message: 'Usuário registrado com sucesso', user });
  } catch (err) {
    console.error('Erro no registro:', err);
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await db.loginUser(email, password);
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '2h'
    });

    res.json({ message: 'Login bem-sucedido', token, user });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message, conversationId, settings } = req.body;
        let conversation = null;
        let isFirstMessage = false;
        
        const aiSettings = { ...DEFAULT_AI_SETTINGS, ...(settings || {}) };
        
        console.log('📨 Chat request recebido:', { 
            message: message.substring(0, 50) + '...', 
            conversationId: conversationId || 'novo',
            settings: aiSettings
        });
        
        if (conversationId) {
            const messages = await db.getConversationMessages(conversationId);
            
            if (messages.length === 0) {
                isFirstMessage = true;
                const newTitle = await generateChatTitle(message, aiSettings);
                await db.updateConversationTitle(conversationId, newTitle);
                conversation = {
                    id: conversationId,
                    title: newTitle
                };
            } else {
                conversation = { id: conversationId };
            }
        } else {
            const newTitle = await generateChatTitle(message, aiSettings);
            conversation = await db.createNewConversation(newTitle);
            isFirstMessage = true;
        }

        console.log('💬 Usando conversa:', conversation.id);

        const allMessages = await db.getConversationMessages(conversation.id);
        const contextMessages = filterContextHistory(allMessages, aiSettings.contextMemory);
        
        const history = contextMessages.map(msg => ({
            [msg.role]: msg.content
        }));

        const basePrompt = `
Você é o SABER – Sistema de Análise e Benefício Educacional em Relatório, um assistente educacional inteligente dedicado a apoiar alunos e professores no processo de ensino-aprendizagem.

Seu papel principal é:
- Responder dúvidas acadêmicas com clareza, empatia e paciência
- Explicar conceitos de forma adaptada ao nível do aluno
- Identificar dificuldades e estimular o pensamento crítico
- Auxiliar na interpretação de textos e resolução de problemas
- Para professores, analisar desempenho e sugerir intervenções pedagógicas

Sempre use linguagem acolhedora, acessível e motivadora. Corrija erros com sensibilidade explicando o raciocínio correto.`;

        const personalizedPrompt = buildPersonalityPrompt(aiSettings.personality, basePrompt);

        const promptParts = [
            personalizedPrompt,
            ...history.map(msg =>
                msg.user
                    ? `Aluno: ${msg.user}`
                    : msg.assistant
                    ? `SABER: ${msg.assistant}`
                    : ''
            ),
            `Aluno: ${message}`,
            `SABER:`
        ];

        const prompt = promptParts.join('\n');

        console.log(`🤖 Configurações da IA: temp=${aiSettings.temperature}, tokens=${aiSettings.maxTokens}, personalidade=${aiSettings.personality}`);

        const response = await cohere.generate({
            model: 'command-r-plus',
            prompt: prompt,
            maxTokens: parseInt(aiSettings.maxTokens) || 300,
            temperature: parseFloat(aiSettings.temperature) || 0.5,
            stopSequences: ['Aluno:'],
        });

        const aiResponse = response.generations[0].text.trim();

        await db.saveMessage(conversation.id, 'user', message);
        await db.saveMessage(conversation.id, 'assistant', aiResponse, aiSettings);

        console.log('Chat processado com sucesso');

        res.json({ 
            response: aiResponse,
            conversationId: conversation.id,
            title: conversation.title,
            isFirstMessage: isFirstMessage,
            appliedSettings: aiSettings
        });

    } catch (error) {
        console.error('Erro ao processar chat:', error);
        res.status(500).json({ error: 'Erro ao processar a mensagem' });
    }
});

app.get('/api/history', authenticateToken, async (req, res) => {
    try {
        const allConversations = await db.getChatHistory(req.user.id);
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const history = {
            today: [],
            yesterday: [],
            week: [],
            older: []
        };
        
        allConversations.forEach(conv => {
            const updatedAt = new Date(conv.updated_at);
            
            if (updatedAt >= today) {
                history.today.push(conv);
            } else if (updatedAt >= yesterday) {
                history.yesterday.push(conv);
            } else if (updatedAt >= weekAgo) {
                history.week.push(conv);
            } else {
                history.older.push(conv);
            }
        });
        
        console.log('Histórico enviado ao frontend');
        res.json(history);
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
});

app.get('/api/conversation/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const messages = await db.getConversationMessages(id);
        console.log(`Conversa ${id} carregada`);
        res.json({ messages, conversationId: id });
    } catch (error) {
        console.error('Erro ao carregar conversa:', error);
        res.status(500).json({ error: 'Erro ao carregar conversa' });
    }
});

app.post('/api/new-conversation', async (req, res) => {
    try {
        const conversation = await db.createNewConversation('Nova Conversa');
        console.log('Nova conversa criada via API:', conversation.id);
        res.json(conversation);
    } catch (error) {
        console.error('Erro ao criar nova conversa:', error);
        res.status(500).json({ error: 'Erro ao criar nova conversa' });
    }
});

app.delete('/api/conversation/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.deleteConversation(id);
        console.log(`✅ Conversa ${id} deletada`);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Erro ao deletar conversa:', error);
        res.status(500).json({ error: 'Erro ao deletar conversa' });
    }
});

app.put('/api/conversation/:id/title', async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;
        
        if (!title || title.trim().length === 0) {
            return res.status(400).json({ error: 'Título não pode estar vazio' });
        }
        
        await db.updateConversationTitle(id, title.trim());
        console.log(`✅ Título da conversa ${id} atualizado`);
        res.json({ success: true, title: title.trim() });
    } catch (error) {
        console.error('❌ Erro ao atualizar título:', error);
        res.status(500).json({ error: 'Erro ao atualizar título' });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const conversationsRes = await db.pool.query('SELECT COUNT(*) as total FROM conversations');
        const messagesRes = await db.pool.query('SELECT COUNT(*) as total FROM messages');
        const userMessagesRes = await db.pool.query("SELECT COUNT(*) as total FROM messages WHERE role = 'user'");
        const todayRes = await db.pool.query(`
            SELECT COUNT(*) as total FROM conversations 
            WHERE DATE(created_at) = CURRENT_DATE
        `);
        
        const stats = {
            totalConversations: parseInt(conversationsRes.rows[0].total),
            totalMessages: parseInt(messagesRes.rows[0].total),
            totalQuestions: parseInt(userMessagesRes.rows[0].total),
            conversationsToday: parseInt(todayRes.rows[0].total)
        };
        
        console.log('Estatísticas enviadas ao frontend');
        res.json(stats);
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

app.get('/api/export', async (req, res) => {
    try {
        console.log('📥 Exportando dados completos...');
        
        const allConversations = await db.getChatHistory();
        
        const fullConversations = await Promise.all(
            allConversations.map(async (conv) => {
                const messages = await db.getConversationMessages(conv.id);
                return {
                    ...conv,
                    messages: messages
                };
            })
        );
        
        const conversationsRes = await db.pool.query('SELECT COUNT(*) as total FROM conversations');
        const messagesRes = await db.pool.query('SELECT COUNT(*) as total FROM messages');
        const userMessagesRes = await db.pool.query("SELECT COUNT(*) as total FROM messages WHERE role = 'user'");
        const todayRes = await db.pool.query(`
            SELECT COUNT(*) as total FROM conversations 
            WHERE DATE(created_at) = CURRENT_DATE
        `);
        
        const stats = {
            totalConversations: parseInt(conversationsRes.rows[0].total),
            totalMessages: parseInt(messagesRes.rows[0].total),
            totalQuestions: parseInt(userMessagesRes.rows[0].total),
            conversationsToday: parseInt(todayRes.rows[0].total)
        };
        
        const exportData = {
            exportDate: new Date().toISOString(),
            version: '2.0.0',
            statistics: stats,
            totalConversations: fullConversations.length,
            conversations: fullConversations
        };
        
        res.json(exportData);
        
        console.log(`Dados exportados: ${fullConversations.length} conversas`);
        
    } catch (error) {
        console.error('❌ Erro ao exportar dados:', error);
        res.status(500).json({ error: 'Erro ao exportar dados' });
    }
});

app.delete('/api/clear-all', async (req, res) => {
    try {
        console.log('🗑️ Limpando todos os dados...');
        await db.clearAllConversations();
        res.json({ success: true, message: 'Todos os dados foram limpos' });
        console.log('✅ Dados limpos com sucesso');
    } catch (error) {
        console.error('❌ Erro ao limpar dados:', error);
        res.status(500).json({ error: 'Erro ao limpar dados' });
    }
});

process.on('SIGINT', async () => {
    console.log('🔄 Encerrando servidor...');
    await db.closeConnection();
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor SABER rodando em http://localhost:${PORT}`);
});
