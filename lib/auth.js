const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const secretKey = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function encrypt(payload) {
  return jwt.sign(payload, secretKey, { 
    expiresIn: '24h',
    algorithm: 'HS256'
  });
}

function decrypt(token) {
  try {
    return jwt.verify(token, secretKey, { algorithms: ['HS256'] });
  } catch (error) {
    return null;
  }
}

function createSession(res, email) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const session = encrypt({ 
    userId: 'admin', 
    email, 
    role: 'admin', 
    expiresAt: expiresAt.getTime()
  });

  res.cookie('session', session, {
    expires: expiresAt,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  return session;
}

function verifySession(req) {
  const token = req.cookies?.session;

  if (!token) return null;

  try {
    const session = decrypt(token);
    
    // Check if session is expired
    if (session && session.expiresAt && Date.now() > session.expiresAt) {
      return null;
    }
    
    return session;
  } catch (error) {
    return null;
  }
}

function deleteSession(res) {
  res.clearCookie('session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

async function hashPassword(password) {
  return await bcrypt.hash(password, 12);
}

async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

// Middleware to verify authentication
function requireAuth(req, res, next) {
  const session = verifySession(req);
  
  if (!session) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required' 
    });
  }
  
  req.user = session;
  next();
}

module.exports = {
  encrypt,
  decrypt,
  createSession,
  verifySession,
  deleteSession,
  hashPassword,
  verifyPassword,
  requireAuth
};
