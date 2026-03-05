const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
    try {
        let token = req.cookies?.agenda_token;

        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }

        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = payload.userId;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
}

module.exports = { requireAuth };