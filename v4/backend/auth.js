/**
 * 认证中间件
 */

const jwt = require('jsonwebtoken');

// JWT 密钥 (生产环境应使用环境变量)
const JWT_SECRET = process.env.JWT_SECRET || 'vocabulary-app-secret-key-2026';
const JWT_EXPIRES_IN = '7d';

/**
 * 生成 JWT Token
 */
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      nickname: user.nickname 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * 验证 JWT Token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * 认证中间件
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: '未登录，请先登录' 
    });
  }
  
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ 
      success: false, 
      error: 'Token 已过期，请重新登录' 
    });
  }
  
  // 将用户信息挂载到 req 对象
  req.user = decoded;
  next();
}

/**
 * 可选认证中间件 (不强制登录)
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  
  next();
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  generateToken,
  verifyToken,
  authMiddleware,
  optionalAuth
};