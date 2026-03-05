const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.split(' ')[1]) || req.cookies?.agenda_token;

    if (!token) return res.status(401).json({ error: 'Não autorizado' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Token inválido' });
    }
}

module.exports = { requireAuth };