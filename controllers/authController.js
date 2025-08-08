// controllers/authController.js
const User = require('../models/user');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'Este email já está registrado.' });
        }
        const user = await User.create(name, email, password);
        res.status(201).json({ message: 'Usuário registrado com sucesso', user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        console.error('Erro no registro:', err.message);
        res.status(500).json({ error: 'Erro interno ao registrar usuário.' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findByEmail(email);
        if (!user || !(await User.comparePassword(password, user.password_hash))) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        const accessToken = jwt.sign(
            { id: user.id, email: user.email, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '15m' } // Token de acesso curto
        );

        // Lógica para refresh token (simplificada)
        // Em produção, o refresh token deve ser armazenado no banco de dados
        const refreshToken = jwt.sign(
            { id: user.id },
            process.env.REFRESH_TOKEN_SECRET, // Crie essa variável no seu .env
            { expiresIn: '7d' }
        );
        
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict' });
        
        res.json({
            message: 'Login bem-sucedido',
            accessToken,
            user: { id: user.id, name: user.name, email: user.email }
        });
    } catch (err) {
        console.error('Erro no login:', err.message);
        res.status(500).json({ error: 'Erro interno no servidor durante o login.' });
    }
};