// middlewares/authenticateToken.js
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Acesso não autorizado: Token não fornecido.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Erro na verificação do token:', err.message);
            return res.status(403).json({ error: 'Token inválido ou expirado.' });
        }
        req.user = user;
        next();
    });
}

module.exports = authenticateToken;