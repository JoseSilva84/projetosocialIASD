import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Não autorizado." });
  }
  const token = h.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    req.userRole = payload.role || 'user';
    req.groupId = payload.groupId || null;
    next();
  } catch {
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }
}
