/**
 * 用户认证路由
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { generateToken, authMiddleware } = require('../auth');

const router = express.Router();

/**
 * 注册
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  const { email, password, nickname } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: '邮箱和密码必填'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      error: '密码至少6位'
    });
  }

  try {
    // 检查邮箱是否已存在
    const existing = req.db.exec(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (existing.length > 0 && existing[0].values.length > 0) {
      return res.status(400).json({
        success: false,
        error: '该邮箱已被注册'
      });
    }

    // 创建用户
    const userId = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);
    const displayName = nickname || email.split('@')[0];

    req.db.run(`
      INSERT INTO users (id, email, password_hash, nickname, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [userId, email.toLowerCase(), passwordHash, displayName]);

    // 保存数据库
    req.saveDatabase();

    // 生成 token
    const token = generateToken({
      id: userId,
      email: email.toLowerCase(),
      nickname: displayName
    });

    res.json({
      success: true,
      message: '注册成功',
      user: {
        id: userId,
        email: email.toLowerCase(),
        nickname: displayName
      },
      token
    });

  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      error: '注册失败，请稍后重试'
    });
  }
});

/**
 * 登录
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: '邮箱和密码必填'
    });
  }

  try {
    // 查找用户
    const result = req.db.exec(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(401).json({
        success: false,
        error: '邮箱或密码错误'
      });
    }

    const user = result[0].values[0];
    const userObj = {
      id: user[0],
      email: user[1],
      password_hash: user[2],
      nickname: user[3],
      avatar: user[4],
      created_at: user[5],
      updated_at: user[6],
      last_login_at: user[7]
    };

    // 验证密码
    const isValid = bcrypt.compareSync(password, userObj.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: '邮箱或密码错误'
      });
    }

    // 更新最后登录时间
    req.db.run(
      'UPDATE users SET last_login_at = datetime("now") WHERE id = ?',
      [userObj.id]
    );
    req.saveDatabase();

    // 生成 token
    const token = generateToken({
      id: userObj.id,
      email: userObj.email,
      nickname: userObj.nickname
    });

    res.json({
      success: true,
      message: '登录成功',
      user: {
        id: userObj.id,
        email: userObj.email,
        nickname: userObj.nickname,
        avatar: userObj.avatar
      },
      token
    });

  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      error: '登录失败，请稍后重试'
    });
  }
});

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = req.db.exec(
      'SELECT id, email, nickname, avatar, created_at, last_login_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    const user = result[0].values[0];
    res.json({
      success: true,
      user: {
        id: user[0],
        email: user[1],
        nickname: user[2],
        avatar: user[3],
        created_at: user[4],
        last_login_at: user[5]
      }
    });

  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      error: '获取用户信息失败'
    });
  }
});

/**
 * 更新用户资料
 * PUT /api/auth/profile
 */
router.put('/profile', authMiddleware, async (req, res) => {
  const { nickname, avatar } = req.body;

  try {
    if (nickname) {
      req.db.run(
        'UPDATE users SET nickname = ?, updated_at = datetime("now") WHERE id = ?',
        [nickname, req.user.id]
      );
    }

    if (avatar) {
      req.db.run(
        'UPDATE users SET avatar = ?, updated_at = datetime("now") WHERE id = ?',
        [avatar, req.user.id]
      );
    }

    req.saveDatabase();

    // 返回更新后的用户信息
    const result = req.db.exec(
      'SELECT id, email, nickname, avatar, created_at, last_login_at FROM users WHERE id = ?',
      [req.user.id]
    );

    const user = result[0].values[0];
    res.json({
      success: true,
      message: '资料更新成功',
      user: {
        id: user[0],
        email: user[1],
        nickname: user[2],
        avatar: user[3]
      }
    });

  } catch (error) {
    console.error('更新资料错误:', error);
    res.status(500).json({
      success: false,
      error: '更新资料失败'
    });
  }
});

/**
 * 修改密码
 * PUT /api/auth/password
 */
router.put('/password', authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      error: '旧密码和新密码必填'
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      error: '新密码至少6位'
    });
  }

  try {
    // 获取当前密码
    const result = req.db.exec(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    const currentHash = result[0].values[0][0];
    const isValid = bcrypt.compareSync(oldPassword, currentHash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: '旧密码错误'
      });
    }

    // 更新密码
    const newHash = bcrypt.hashSync(newPassword, 10);
    req.db.run(
      'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?',
      [newHash, req.user.id]
    );
    req.saveDatabase();

    res.json({
      success: true,
      message: '密码修改成功'
    });

  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({
      success: false,
      error: '修改密码失败'
    });
  }
});

module.exports = router;