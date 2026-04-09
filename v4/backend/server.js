/**
 * 词汇管理助手 v4 - 多用户版本
 * 
 * 主要改动：
 * 1. 添加用户表和认证系统
 * 2. 所有 API 需要认证（登录后才能使用）
 * 3. 词汇按 user_id 隔离
 */

const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

// 认证模块
const { authMiddleware, optionalAuth } = require('./auth');

// 路由
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 10827; // v4 使用新端口

// API 配置
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || 'sk-0260e037740d47aebf6ed46cc3341e7c';
const DASHSCOPE_BASE_URL = 'dashscope.aliyuncs.com';

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 静态文件服务（前端）
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// 数据库路径（沿用 v3 的数据库）
const dbPath = path.join(__dirname, 'vocabulary.db');

// 全局数据库实例
let db = null;

// 初始化数据库
async function initDatabase() {
  const SQL = await initSqlJs();
  
  try {
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
      console.log('数据库加载成功');
    } else {
      db = new SQL.Database();
      console.log('创建新数据库');
    }
  } catch (e) {
    console.log('创建新数据库（文件损坏）');
    db = new SQL.Database();
  }

  // 创建用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nickname TEXT,
      avatar TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      last_login_at TEXT
    )
  `);

  // 创建词汇表（v4 结构 - 添加 user_id）
  db.run(`
    CREATE TABLE IF NOT EXISTS vocabulary (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      word TEXT NOT NULL,
      pinyin TEXT,
      meaning TEXT,
      english_meaning TEXT,
      detail TEXT,
      phrases TEXT,
      sentences TEXT,
      level TEXT DEFAULT 'beginner',
      category TEXT,
      status TEXT DEFAULT 'new',
      review_count INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      last_reviewed_at TEXT,
      language TEXT DEFAULT 'auto',
      ai_generated INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 创建练习题表（添加 user_id）
  db.run(`
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      type TEXT NOT NULL,
      title TEXT,
      questions TEXT,
      answers TEXT,
      vocabulary_ids TEXT,
      score INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      created_at TEXT,
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 创建错题本表（添加 user_id）
  db.run(`
    CREATE TABLE IF NOT EXISTS wrong_answers (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      vocabulary_id TEXT NOT NULL,
      exercise_id TEXT,
      question_type TEXT,
      user_answer TEXT,
      correct_answer TEXT,
      created_at TEXT,
      solved INTEGER DEFAULT 0,
      solved_at TEXT,
      FOREIGN KEY (vocabulary_id) REFERENCES vocabulary(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 创建索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_vocabulary_user_id ON vocabulary(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_wrong_answers_user_id ON wrong_answers(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_wrong_answers_solved ON wrong_answers(solved)`);
  
  // 创建默认管理员用户（如果用户表为空）
  const userCountResult = db.exec("SELECT COUNT(*) FROM users");
  const userCount = userCountResult[0]?.values?.[0]?.[0] || 0;
  
  if (userCount === 0) {
    const bcrypt = require('bcryptjs');
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    const defaultUserId = 'default-admin';
    
    db.run(`
      INSERT INTO users (id, email, password_hash, nickname, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [defaultUserId, 'admin@localhost', defaultPassword, '管理员']);
    
    console.log('✅ 创建默认管理员用户');
    console.log('   邮箱: admin@localhost');
    console.log('   密码: admin123');
    console.log('   ⚠️  请登录后立即修改密码！');
  }

  saveDatabase();
  console.log('数据库初始化完成');
}

// 保存数据库
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// 自动保存
setInterval(() => {
  if (db) {
    saveDatabase();
  }
}, 30000);

// 将 db 和 saveDatabase 注入到请求对象
app.use((req, res, next) => {
  req.db = db;
  req.saveDatabase = saveDatabase;
  next();
});

// ========== 认证路由（不需要登录） ==========

app.use('/api/auth', authRoutes);

// 健康检查（不需要登录）
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: 'v4', timestamp: new Date().toISOString() });
});

// ========== 词汇路由（需要登录） ==========

// AI 请求函数
function aiRequest(prompt, systemPrompt = '你是一个专业的语言学习助手。') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'qwen-plus',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    const options = {
      hostname: DASHSCOPE_BASE_URL,
      port: 443,
      path: '/compatible-mode/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.choices && result.choices[0] && result.choices[0].message) {
            resolve(result.choices[0].message.content);
          } else {
            reject(new Error('AI 响应格式错误：' + data));
          }
        } catch (e) {
          reject(new Error('解析失败：' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// 解析 AI 生成的词汇信息
function parseVocabularyAI(content, word) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      return {
        pinyin: data.pinyin || '',
        meaning: data.meaning || data.chineseMeaning || '',
        english_meaning: data.englishMeaning || '',
        detail: data.detail || '',
        phrases: data.phrases || '',
        sentences: data.sentences || data.example || '',
        level: data.level || 'beginner',
        language: data.language || detectLanguage(word)
      };
    }
  } catch (e) {}
  
  return {
    meaning: content,
    level: 'beginner',
    language: detectLanguage(word)
  };
}

// 检测语言
function detectLanguage(word) {
  const chineseRegex = /[\u4e00-\u9fa5]/;
  return chineseRegex.test(word) ? 'zh' : 'en';
}

// 获取用户的所有词汇
app.get('/api/vocabulary', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const { category, level, status, search, language } = req.query;
    
    let query = 'SELECT * FROM vocabulary WHERE user_id = ?';
    const params = [userId];

    if (category) { query += ' AND category = ?'; params.push(category); }
    if (level) { query += ' AND level = ?'; params.push(level); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (language) { query += ' AND language = ?'; params.push(language); }
    if (search) {
      query += ' AND (word LIKE ? OR meaning LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';
    
    const stmt = db.prepare(query);
    stmt.bind(params);
    
    const vocabulary = [];
    while (stmt.step()) vocabulary.push(stmt.getAsObject());
    stmt.free();
    
    res.json({ success: true, data: vocabulary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取单个词汇
app.get('/api/vocabulary/:id', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const stmt = db.prepare('SELECT * FROM vocabulary WHERE id = ? AND user_id = ?');
    stmt.bind([req.params.id, userId]);
    let vocab = null;
    if (stmt.step()) vocab = stmt.getAsObject();
    stmt.free();
    
    if (!vocab) return res.status(404).json({ success: false, error: '词汇不存在或无权访问' });
    res.json({ success: true, data: vocab });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI 智能生成词汇信息
app.post('/api/vocabulary/generate', authMiddleware, async (req, res) => {
  try {
    const { word } = req.body;
    if (!word) {
      return res.status(400).json({ success: false, error: '请提供词语' });
    }

    const systemPrompt = `你是一个专业的语言学习助手，帮助用户学习词汇。
请分析用户输入的词语，返回 JSON 格式：
{
  "pinyin": "如果是中文词语，填写汉语拼音（带声调）；如果是英文单词，填写 IPA 国际音标",
  "meaning": "中文释义",
  "englishMeaning": "英文释义",
  "detail": "详细说明，包括词性、用法等",
  "phrases": "常用组词或短语，每行一个",
  "sentences": "例句，格式：中文|英文",
  "level": "beginner 或 intermediate 或 advanced",
  "language": "zh 或 en"
}
只返回 JSON，不要其他内容。`;

    const content = await aiRequest(`请详细分析这个词语："${word}"`, systemPrompt);
    const parsed = parseVocabularyAI(content, word);
    
    res.json({ 
      success: true, 
      data: { 
        word,
        ...parsed,
        status: 'new'
      } 
    });
  } catch (error) {
    console.error('AI 生成失败:', error);
    res.status(500).json({ 
      success: false, 
      error: 'AI 生成失败：' + error.message 
    });
  }
});

// 创建词汇
app.post('/api/vocabulary', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      word, pinyin, meaning, englishMeaning, detail, phrases, sentences, 
      level, category, language 
    } = req.body;
    
    if (!word) {
      return res.status(400).json({ success: false, error: '词语为必填项' });
    }
    
    const now = new Date().toISOString();
    const detectedLang = language || detectLanguage(word);
    
    // 检查用户是否已有相同词汇
    const checkStmt = db.prepare('SELECT * FROM vocabulary WHERE LOWER(word) = LOWER(?) AND user_id = ?');
    checkStmt.bind([word, userId]);
    let existing = null;
    if (checkStmt.step()) existing = checkStmt.getAsObject();
    checkStmt.free();
    
    if (existing) {
      // 更新已有词汇
      db.run(`
        UPDATE vocabulary SET 
          word = ?, pinyin = ?, meaning = ?, english_meaning = ?, detail = ?, 
          phrases = ?, sentences = ?, level = ?, category = ?, language = ?,
          updated_at = ?
        WHERE id = ?
      `, [word, pinyin || null, meaning || null, englishMeaning || null, detail || null, 
          phrases || null, sentences || null, level || 'beginner', category || null, 
          detectedLang, now, existing.id]);
      
      saveDatabase();
      
      const stmt = db.prepare('SELECT * FROM vocabulary WHERE id = ?');
      stmt.bind([existing.id]);
      let vocab = null;
      if (stmt.step()) vocab = stmt.getAsObject();
      stmt.free();
      
      res.json({ success: true, data: vocab, message: '词汇已更新' });
    } else {
      // 创建新词汇
      const id = uuidv4();
      db.run(`
        INSERT INTO vocabulary (id, user_id, word, pinyin, meaning, english_meaning, detail, phrases, sentences, level, category, status, language, review_count, correct_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, userId, word, pinyin || null, meaning || null, englishMeaning || null, detail || null, 
          phrases || null, sentences || null, level || 'beginner', category || null, 'new', 
          detectedLang, 0, 0, now, now]);
      
      saveDatabase();
      
      const stmt = db.prepare('SELECT * FROM vocabulary WHERE id = ?');
      stmt.bind([id]);
      let vocab = null;
      if (stmt.step()) vocab = stmt.getAsObject();
      stmt.free();
      
      res.status(201).json({ success: true, data: vocab, message: '词汇已创建' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新词汇
app.put('/api/vocabulary/:id', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const data = req.body;
    
    const checkStmt = db.prepare('SELECT * FROM vocabulary WHERE id = ? AND user_id = ?');
    checkStmt.bind([id, userId]);
    let existing = null;
    if (checkStmt.step()) existing = checkStmt.getAsObject();
    checkStmt.free();
    
    if (!existing) return res.status(404).json({ success: false, error: '词汇不存在或无权访问' });

    const now = new Date().toISOString();
    
    db.run(`
      UPDATE vocabulary SET 
        word = ?, pinyin = ?, meaning = ?, english_meaning = ?, detail = ?, 
        phrases = ?, sentences = ?, level = ?, category = ?, language = ?,
        review_count = ?, correct_count = ?, last_reviewed_at = ?, updated_at = ?
      WHERE id = ?
    `, [
      data.word !== undefined ? data.word : existing.word,
      data.pinyin !== undefined ? data.pinyin : existing.pinyin,
      data.meaning !== undefined ? data.meaning : existing.meaning,
      data.englishMeaning !== undefined ? data.englishMeaning : existing.english_meaning,
      data.detail !== undefined ? data.detail : existing.detail,
      data.phrases !== undefined ? data.phrases : existing.phrases,
      data.sentences !== undefined ? data.sentences : existing.sentences,
      data.level !== undefined ? data.level : existing.level,
      data.category !== undefined ? data.category : existing.category,
      data.language !== undefined ? data.language : existing.language,
      data.review_count !== undefined ? data.review_count : existing.review_count,
      data.correct_count !== undefined ? data.correct_count : existing.correct_count,
      data.last_reviewed_at || existing.last_reviewed_at,
      now,
      id
    ]);
    
    saveDatabase();
    
    const stmt = db.prepare('SELECT * FROM vocabulary WHERE id = ?');
    stmt.bind([id]);
    let vocab = null;
    if (stmt.step()) vocab = stmt.getAsObject();
    stmt.free();
    
    res.json({ success: true, data: vocab });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除词汇
app.delete('/api/vocabulary/:id', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const checkStmt = db.prepare('SELECT * FROM vocabulary WHERE id = ? AND user_id = ?');
    checkStmt.bind([id, userId]);
    let existing = null;
    if (checkStmt.step()) existing = checkStmt.getAsObject();
    checkStmt.free();
    
    if (!existing) return res.status(404).json({ success: false, error: '词汇不存在或无权访问' });
    
    db.run('DELETE FROM vocabulary WHERE id = ?', [id]);
    db.run('DELETE FROM wrong_answers WHERE vocabulary_id = ?', [id]);
    saveDatabase();
    
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 练习路由（需要登录） ==========

// 生成练习题
app.post('/api/exercises/generate', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, vocabIds, count = 5 } = req.body;
    
    // 获取用户的词汇
    let vocabList = [];
    if (vocabIds && vocabIds.length > 0) {
      const placeholders = vocabIds.map(() => '?').join(',');
      const stmt = db.prepare(`SELECT * FROM vocabulary WHERE id IN (${placeholders}) AND user_id = ? ORDER BY RANDOM() LIMIT ?`);
      stmt.bind([...vocabIds, userId, count]);
      while (stmt.step()) vocabList.push(stmt.getAsObject());
      stmt.free();
    } else {
      const stmt = db.prepare('SELECT * FROM vocabulary WHERE user_id = ? AND meaning IS NOT NULL ORDER BY RANDOM() LIMIT ?');
      stmt.bind([userId, count]);
      while (stmt.step()) vocabList.push(stmt.getAsObject());
      stmt.free();
    }

    if (vocabList.length === 0) {
      return res.status(400).json({ success: false, error: '没有足够的词汇生成练习题' });
    }

    // 根据类型生成题目
    let questions = [];

    if (type === 'choice') {
      questions = vocabList.map((v, i) => {
        const otherVocab = vocabList.filter((_, idx) => idx !== i).slice(0, 3);
        const options = [v.meaning, ...otherVocab.map(x => x.meaning)].sort(() => Math.random() - 0.5);
        
        return {
          id: i,
          type: 'choice',
          prompt: `"${v.word}" 的正确释义是？`,
          pinyin: v.pinyin,
          answer: v.meaning,
          options,
          vocabularyId: v.id
        };
      });
    } else if (type === 'translation') {
      questions = vocabList.map((v, i) => {
        const otherVocab = vocabList.filter((_, idx) => idx !== i).slice(0, 3);
        const options = [v.meaning, ...otherVocab.map(x => x.meaning)].sort(() => Math.random() - 0.5);
        
        return {
          id: i,
          type: 'translation',
          prompt: `"${v.word}" 的意思是？`,
          answer: v.meaning,
          options,
          vocabularyId: v.id
        };
      });
    }

    const exerciseId = uuidv4();
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO exercises (id, user_id, type, title, questions, answers, vocabulary_ids, completed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [exerciseId, userId, type, '词汇练习', JSON.stringify(questions), 
        JSON.stringify(questions.map(q => q.answer)), JSON.stringify(vocabList.map(v => v.id)), 0, now]);
    
    saveDatabase();

    res.json({
      success: true,
      data: {
        id: exerciseId,
        type,
        questions,
        totalQuestions: questions.length
      }
    });
  } catch (error) {
    console.error('生成练习题失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 提交练习题答案
app.post('/api/exercises/:id/submit', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { answers } = req.body;

    const stmt = db.prepare('SELECT * FROM exercises WHERE id = ? AND user_id = ?');
    stmt.bind([id, userId]);
    let exercise = null;
    if (stmt.step()) exercise = stmt.getAsObject();
    stmt.free();

    if (!exercise) return res.status(404).json({ success: false, error: '练习题不存在' });

    const questions = JSON.parse(exercise.questions);
    let correctCount = 0;
    const wrongAnswers = [];

    const now = new Date().toISOString();

    questions.forEach((q, i) => {
      const userAnswer = (answers[i] || '').trim();
      const correctAnswer = q.answer.trim();
      const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
      
      if (isCorrect) {
        correctCount++;
      } else {
        // 记录错题
        const wrongId = uuidv4();
        db.run(`
          INSERT INTO wrong_answers (id, user_id, vocabulary_id, exercise_id, question_type, user_answer, correct_answer, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [wrongId, userId, q.vocabularyId, id, q.type, userAnswer, correctAnswer, now]);
        
        wrongAnswers.push({
          questionId: q.id,
          vocabularyId: q.vocabularyId,
          userAnswer,
          correctAnswer
        });
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);

    db.run('UPDATE exercises SET score = ?, completed = 1, completed_at = ? WHERE id = ?',
      [score, now, id]);
    saveDatabase();

    // 更新词汇的复习计数
    const vocabIds = JSON.parse(exercise.vocabulary_ids);
    vocabIds.forEach(vid => {
      db.run('UPDATE vocabulary SET review_count = review_count + 1, correct_count = correct_count + ?, last_reviewed_at = ? WHERE id = ? AND user_id = ?',
        [correctCount > i ? 1 : 0, now, vid, userId]);
    });
    saveDatabase();

    res.json({
      success: true,
      data: {
        score,
        totalQuestions: questions.length,
        correctCount,
        wrongAnswers
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取错题本列表
app.get('/api/wrong-answers', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const { unsolvedOnly } = req.query;
    
    let query = `
      SELECT w.*, v.word, v.meaning, v.pinyin, v.language 
      FROM wrong_answers w 
      JOIN vocabulary v ON w.vocabulary_id = v.id 
      WHERE w.user_id = ?
    `;
    const params = [userId];
    
    if (unsolvedOnly === 'true') {
      query += ' AND w.solved = 0';
    }
    
    query += ' ORDER BY w.created_at DESC';
    
    const stmt = db.prepare(query);
    stmt.bind(params);
    
    const wrongAnswers = [];
    while (stmt.step()) wrongAnswers.push(stmt.getAsObject());
    stmt.free();
    
    res.json({ success: true, data: wrongAnswers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 标记错题为已掌握
app.put('/api/wrong-answers/:id/solve', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const now = new Date().toISOString();
    
    const checkStmt = db.prepare('SELECT * FROM wrong_answers WHERE id = ? AND user_id = ?');
    checkStmt.bind([id, userId]);
    let existing = null;
    if (checkStmt.step()) existing = checkStmt.getAsObject();
    checkStmt.free();
    
    if (!existing) return res.status(404).json({ success: false, error: '错题记录不存在' });
    
    db.run('UPDATE wrong_answers SET solved = 1, solved_at = ? WHERE id = ?', [now, id]);
    saveDatabase();
    
    res.json({ success: true, message: '已标记为已掌握' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 统计路由（需要登录） ==========

// 获取统计信息
app.get('/api/stats', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    
    // 获取今日开始时间
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();
    
    let stmt = db.prepare('SELECT COUNT(*) as count FROM vocabulary WHERE user_id = ?');
    stmt.bind([userId]);
    const total = stmt.step() ? stmt.getAsObject().count : 0;
    stmt.free();
    
    stmt = db.prepare('SELECT COUNT(*) as count FROM vocabulary WHERE user_id = ? AND created_at >= ?');
    stmt.bind([userId, todayStart]);
    const todayAdded = stmt.step() ? stmt.getAsObject().count : 0;
    stmt.free();
    
    stmt = db.prepare('SELECT COUNT(*) as count FROM vocabulary WHERE user_id = ? AND last_reviewed_at >= ?');
    stmt.bind([userId, todayStart]);
    const todayReviewed = stmt.step() ? stmt.getAsObject().count : 0;
    stmt.free();
    
    stmt = db.prepare('SELECT COUNT(*) as count FROM wrong_answers WHERE user_id = ? AND solved = 0');
    stmt.bind([userId]);
    const unsolvedCount = stmt.step() ? stmt.getAsObject().count : 0;
    stmt.free();
    
    res.json({
      success: true,
      data: { 
        total, 
        todayAdded, 
        todayReviewed,
        unsolvedWrongAnswers: unsolvedCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 音频代理 ==========

app.get('/api/audio', (req, res) => {
  const { word, lang } = req.query;
  if (!word) {
    return res.status(400).json({ success: false, error: '请提供词汇' });
  }
  
  const type = lang === 'zh' ? 1 : 1;
  const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`;
  
  https.get(audioUrl, (audioRes) => {
    res.setHeader('Content-Type', 'audio/mp3');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    audioRes.pipe(res);
  }).on('error', (err) => {
    res.status(500).json({ success: false, error: '获取音频失败' });
  });
});

// ========== 前端路由 ==========

// 处理所有非 API 路由，返回前端页面
app.use((req, res, next) => {
  // 如果是 API 路由但没匹配到，返回 404
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'API 路由不存在' });
  }
  // 其他路由返回前端页面
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ========== 启动服务器 ==========

async function startServer() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`词汇管理助手 v4 后端服务运行在 http://localhost:${PORT}`);
    console.log(`数据库路径：${dbPath}`);
    console.log('\n默认账号：');
    console.log('  邮箱: admin@localhost');
    console.log('  密码: admin123');
  });
}

startServer().catch(console.error);