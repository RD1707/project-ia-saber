// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
// const chatRoutes = require('./routes/chat'); // Adicionaremos este em breve

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de Segurança
app.use(helmet());
app.use(cors({
    origin: 'http://localhost:3000', // Em produção, ajuste para o seu domínio
    credentials: true
}));

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutos
	max: 100, // Limita cada IP a 100 requisições por janela
	standardHeaders: true,
	legacyHeaders: false,
});
app.use(limiter);


app.use(express.json());
app.use(express.static(path.join(__dirname, 'static')));

// Rotas da API
app.use('/api/auth', authRoutes);
// app.use('/api/chat', chatRoutes); // Adicionaremos este em breve

// Rota principal para servir o frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

// Tratamento de Encerramento Gracioso
const server = app.listen(PORT, () => {
    console.log(`Servidor SABER rodando na porta ${PORT}`);
});

process.on('SIGINT', () => {
    console.log('Encerrando servidor (SIGINT)...');
    server.close(() => {
        console.log('Servidor encerrado.');
        process.exit(0);
    });
});