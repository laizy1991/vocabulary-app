const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 10826;

// API 配置
const DASHSCOPE_API_KEY = 'sk-0260e037740d47aebf6ed46cc3341e7c';
const DASHSCOPE_BASE_URL = 'dashscope.aliyuncs.com';

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 静态文件服务（前端）
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// 数据库路径
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

  // 创建词汇表
  db.run(`
    CREATE TABLE IF NOT EXISTS vocabulary (
      id TEXT PRIMARY KEY,
      word TEXT NOT NULL,
      meaning TEXT,
      example TEXT,
      sentence TEXT,
      level TEXT DEFAULT 'beginner',
      tags TEXT,
      category TEXT,
      notes TEXT,
      status TEXT DEFAULT 'new',
      review_count INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      last_reviewed_at TEXT,
      language TEXT DEFAULT 'auto',
      ai_generated INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 创建练习题表
  db.run(`
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT,
      questions TEXT,
      answers TEXT,
      vocabulary_ids TEXT,
      score INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      created_at TEXT,
      completed_at TEXT
    )
  `);

  // 创建分类表
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#3b82f6',
      created_at TEXT
    )
  `);

  // 初始化默认分类
  const defaultCategories = [
    { id: '1', name: '默认', color: '#3b82f6' },
    { id: '2', name: '工作', color: '#10b981' },
    { id: '3', name: '学习', color: '#f59e0b' },
    { id: '4', name: '生活', color: '#ef4444' }
  ];

  defaultCategories.forEach(cat => {
    try {
      db.run('INSERT OR IGNORE INTO categories (id, name, color, created_at) VALUES (?, ?, ?, ?)',
        [cat.id, cat.name, cat.color, new Date().toISOString()]);
    } catch (e) {}
  });

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
      max_tokens: 1000
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
function parseVocabularyAI(content) {
  try {
    // 尝试提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      return {
        meaning: data.meaning || '',
        example: data.example || '',
        sentence: data.sentence || '',
        level: data.level || 'beginner',
        language: data.language || 'auto'
      };
    }
  } catch (e) {}
  
  // 备用解析：按行解析
  const lines = content.split('\n');
  const result = { meaning: '', example: '', sentence: '', level: 'beginner', language: 'auto' };
  
  lines.forEach(line => {
    if (line.includes('释义') || line.includes('meaning')) {
      result.meaning = line.replace(/.*[:：]/, '').trim();
    } else if (line.includes('例句') || line.includes('example')) {
      result.example = line.replace(/.*[:：]/, '').trim();
    } else if (line.includes('等级') || line.includes('level')) {
      const levelMatch = line.match(/beginner|intermediate|advanced|初级 | 中级 | 高级/i);
      if (levelMatch) {
        const levelMap = { '初级': 'beginner', '中级': 'intermediate', '高级': 'advanced' };
        result.level = levelMap[levelMatch[0]] || 'beginner';
      }
    }
  });
  
  return result;
}

// API 路由

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 获取所有词汇
app.get('/api/vocabulary', (req, res) => {
  try {
    const { category, level, status, search, language } = req.query;
    let query = 'SELECT * FROM vocabulary WHERE 1=1';
    const params = [];

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
    if (params.length > 0) stmt.bind(params);
    
    const vocabulary = [];
    while (stmt.step()) vocabulary.push(stmt.getAsObject());
    stmt.free();
    
    res.json({ success: true, data: vocabulary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取单个词汇
app.get('/api/vocabulary/:id', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM vocabulary WHERE id = ?');
    stmt.bind([req.params.id]);
    let vocab = null;
    if (stmt.step()) vocab = stmt.getAsObject();
    stmt.free();
    
    if (!vocab) return res.status(404).json({ success: false, error: '词汇不存在' });
    res.json({ success: true, data: vocab });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI 智能生成词汇信息
app.post('/api/vocabulary/generate', async (req, res) => {
  try {
    const { word } = req.body;
    if (!word) {
      return res.status(400).json({ success: false, error: '请提供词语' });
    }

    const systemPrompt = `你是一个专业的语言学习助手，帮助用户学习词汇。
请分析用户输入的词语，返回 JSON 格式：
{
  "meaning": "词语的准确释义",
  "example": "常用搭配或短语",
  "sentence": "一个完整的例句（包含该词语）",
  "level": "beginner 或 intermediate 或 advanced",
  "language": "zh 或 en（判断是中文还是英文）"
}
只返回 JSON，不要其他内容。`;

    const content = await aiRequest(`请分析这个词语："${word}"`, systemPrompt);
    const parsed = parseVocabularyAI(content);
    
    res.json({ 
      success: true, 
      data: { 
        word,
        ...parsed,
        tags: [],
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
app.post('/api/vocabulary', (req, res) => {
  try {
    const { word, meaning, example, sentence, level, tags, category, notes, language, ai_generated } = req.body;
    
    if (!word) {
      return res.status(400).json({ success: false, error: '词语为必填项' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    
    db.run(`
      INSERT INTO vocabulary (id, word, meaning, example, sentence, level, tags, category, notes, status, language, ai_generated, review_count, correct_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, word, meaning || null, example || null, sentence || null, level || 'beginner', 
        JSON.stringify(tags || []), category || null, notes || null, 'new', language || 'auto',
        ai_generated ? 1 : 0, 0, 0, now, now]);
    
    saveDatabase();
    
    const stmt = db.prepare('SELECT * FROM vocabulary WHERE id = ?');
    stmt.bind([id]);
    let vocab = null;
    if (stmt.step()) vocab = stmt.getAsObject();
    stmt.free();
    
    res.status(201).json({ success: true, data: vocab });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新词汇
app.put('/api/vocabulary/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    const checkStmt = db.prepare('SELECT * FROM vocabulary WHERE id = ?');
    checkStmt.bind([id]);
    let existing = null;
    if (checkStmt.step()) existing = checkStmt.getAsObject();
    checkStmt.free();
    
    if (!existing) return res.status(404).json({ success: false, error: '词汇不存在' });

    const now = new Date().toISOString();
    
    db.run(`
      UPDATE vocabulary SET 
        word = ?, meaning = ?, example = ?, sentence = ?, level = ?, 
        tags = ?, category = ?, notes = ?, status = ?, language = ?,
        review_count = ?, correct_count = ?, last_reviewed_at = ?, updated_at = ?
      WHERE id = ?
    `, [
      data.word !== undefined ? data.word : existing.word,
      data.meaning !== undefined ? data.meaning : existing.meaning,
      data.example !== undefined ? data.example : existing.example,
      data.sentence !== undefined ? data.sentence : existing.sentence,
      data.level !== undefined ? data.level : existing.level,
      data.tags !== undefined ? JSON.stringify(data.tags) : existing.tags,
      data.category !== undefined ? data.category : existing.category,
      data.notes !== undefined ? data.notes : existing.notes,
      data.status !== undefined ? data.status : existing.status,
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
app.delete('/api/vocabulary/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const checkStmt = db.prepare('SELECT * FROM vocabulary WHERE id = ?');
    checkStmt.bind([id]);
    let existing = null;
    if (checkStmt.step()) existing = checkStmt.getAsObject();
    checkStmt.free();
    
    if (!existing) return res.status(404).json({ success: false, error: '词汇不存在' });
    
    db.run('DELETE FROM vocabulary WHERE id = ?', [id]);
    saveDatabase();
    
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 批量导入
app.post('/api/vocabulary/batch', (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: '需要提供词汇数组' });
    }

    const now = new Date().toISOString();
    const inserted = [];

    db.run('BEGIN TRANSACTION');
    try {
      items.forEach(item => {
        const id = item.id || uuidv4();
        db.run(`
          INSERT INTO vocabulary (id, word, meaning, example, sentence, level, tags, category, status, language, ai_generated, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, item.word, item.meaning, item.example, item.sentence, item.level || 'beginner',
            JSON.stringify(item.tags || []), item.category, item.status || 'new', item.language || 'auto',
            item.ai_generated ? 1 : 0, now, now]);
        inserted.push(id);
      });
      db.run('COMMIT');
      saveDatabase();
      res.json({ success: true, data: inserted });
    } catch (e) {
      db.run('ROLLBACK');
      throw e;
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 生成练习题
app.post('/api/exercises/generate', async (req, res) => {
  try {
    const { type, vocabularyIds, count = 10 } = req.body;
    
    // 获取词汇
    let vocabList = [];
    if (vocabularyIds && vocabularyIds.length > 0) {
      const placeholders = vocabularyIds.map(() => '?').join(',');
      const stmt = db.prepare(`SELECT * FROM vocabulary WHERE id IN (${placeholders})`);
      stmt.bind(vocabularyIds);
      while (stmt.step()) vocabList.push(stmt.getAsObject());
      stmt.free();
    } else {
      const stmt = db.prepare('SELECT * FROM vocabulary WHERE meaning IS NOT NULL AND (example IS NOT NULL OR sentence IS NOT NULL) LIMIT ?');
      stmt.bind([count]);
      while (stmt.step()) vocabList.push(stmt.getAsObject());
      stmt.free();
    }

    if (vocabList.length === 0) {
      return res.status(400).json({ success: false, error: '没有足够的词汇生成练习题' });
    }

    // 根据类型生成题目
    let questions = [];
    let title = '';

    if (type === 'dictation') {
      // 听写练习
      title = '词语听写练习';
      questions = vocabList.map((v, i) => ({
        id: i,
        type: 'dictation',
        prompt: v.language === 'en' ? `请写出"${v.meaning}"对应的英文单词` : `请写出"${v.meaning}"对应的中文词语`,
        hint: v.example,
        answer: v.word,
        vocabularyId: v.id
      }));
    } else if (type === 'matching') {
      // 中英文对照
      title = '中英文配对练习';
      const shuffled = [...vocabList].sort(() => Math.random() - 0.5);
      questions = shuffled.slice(0, Math.min(count, vocabList.length)).map((v, i) => ({
        id: i,
        type: 'matching',
        question: v.word,
        answer: v.meaning,
        vocabularyId: v.id,
        options: vocabList.slice(0, 4).map(x => x.meaning).sort(() => Math.random() - 0.5)
      }));
    } else if (type === 'fillblank') {
      // 填空练习
      title = '句子填空练习';
      questions = vocabList.map((v, i) => {
        const sentence = v.sentence || v.example || `${v.word}是一个重要的词汇`;
        const blanked = sentence.replace(new RegExp(v.word, 'gi'), '___');
        return {
          id: i,
          type: 'fillblank',
          prompt: '请填写空白处的词语',
          sentence: blanked,
          answer: v.word,
          vocabularyId: v.id
        };
      });
    }

    const exerciseId = uuidv4();
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO exercises (id, type, title, questions, answers, vocabulary_ids, completed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [exerciseId, type, title, JSON.stringify(questions), JSON.stringify(questions.map(q => q.answer)),
        JSON.stringify(vocabList.map(v => v.id)), 0, now]);
    
    saveDatabase();

    res.json({
      success: true,
      data: {
        id: exerciseId,
        type,
        title,
        questions,
        totalQuestions: questions.length
      }
    });
  } catch (error) {
    console.error('生成练习题失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取练习题
app.get('/api/exercises/:id', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM exercises WHERE id = ?');
    stmt.bind([req.params.id]);
    let exercise = null;
    if (stmt.step()) exercise = stmt.getAsObject();
    stmt.free();

    if (!exercise) return res.status(404).json({ success: false, error: '练习题不存在' });

    const questions = JSON.parse(exercise.questions);
    // 返回题目时不包含答案
    const questionsWithoutAnswers = questions.map(q => {
      const { answer, ...rest } = q;
      return rest;
    });

    res.json({
      success: true,
      data: {
        ...exercise,
        questions: questionsWithoutAnswers
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 提交练习题答案
app.post('/api/exercises/:id/submit', (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;

    const stmt = db.prepare('SELECT * FROM exercises WHERE id = ?');
    stmt.bind([id]);
    let exercise = null;
    if (stmt.step()) exercise = stmt.getAsObject();
    stmt.free();

    if (!exercise) return res.status(404).json({ success: false, error: '练习题不存在' });

    const questions = JSON.parse(exercise.questions);
    let correctCount = 0;
    const results = questions.map((q, i) => {
      const userAnswer = (answers[i] || '').trim().toLowerCase();
      const correctAnswer = q.answer.trim().toLowerCase();
      const isCorrect = userAnswer === correctAnswer;
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        userAnswer: answers[i],
        correctAnswer: q.answer,
        isCorrect
      };
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const now = new Date().toISOString();

    db.run('UPDATE exercises SET score = ?, completed = 1, completed_at = ? WHERE id = ?',
      [score, now, id]);
    saveDatabase();

    // 更新词汇的复习计数
    const vocabIds = JSON.parse(exercise.vocabulary_ids);
    vocabIds.forEach(vid => {
      try {
        db.run('UPDATE vocabulary SET review_count = review_count + 1, correct_count = correct_count + ? WHERE id = ?',
          [correctCount > 0 ? 1 : 0, vid]);
      } catch (e) {}
    });
    saveDatabase();

    res.json({
      success: true,
      data: {
        score,
        totalQuestions: questions.length,
        correctCount,
        results
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取统计信息
app.get('/api/stats', (req, res) => {
  try {
    let stmt;
    
    stmt = db.prepare('SELECT COUNT(*) as count FROM vocabulary');
    const total = stmt.step() ? stmt.getAsObject().count : 0;
    stmt.free();
    
    stmt = db.prepare('SELECT language, COUNT(*) as count FROM vocabulary GROUP BY language');
    const byLanguage = [];
    while (stmt.step()) byLanguage.push(stmt.getAsObject());
    stmt.free();
    
    stmt = db.prepare('SELECT level, COUNT(*) as count FROM vocabulary GROUP BY level');
    const byLevel = [];
    while (stmt.step()) byLevel.push(stmt.getAsObject());
    stmt.free();
    
    stmt = db.prepare('SELECT status, COUNT(*) as count FROM vocabulary GROUP BY status');
    const byStatus = [];
    while (stmt.step()) byStatus.push(stmt.getAsObject());
    stmt.free();

    stmt = db.prepare('SELECT COUNT(*) as count FROM exercises WHERE completed = 1');
    const completedExercises = stmt.step() ? stmt.getAsObject().count : 0;
    stmt.free();
    
    res.json({
      success: true,
      data: { total, byLanguage, byLevel, byStatus, completedExercises }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取分类
app.get('/api/categories', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM categories ORDER BY created_at');
    const categories = [];
    while (stmt.step()) categories.push(stmt.getAsObject());
    stmt.free();
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 前端路由
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// 启动服务器
async function startServer() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`词汇管理后端服务运行在 http://localhost:${PORT}`);
    console.log(`数据库路径：${dbPath}`);
  });
}

startServer().catch(console.error);
