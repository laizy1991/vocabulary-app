/**
 * v4 数据库迁移脚本
 * 添加用户表和 user_id 字段
 */

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'vocabulary.db');

async function migrate() {
  console.log('开始 v4 数据库迁移...');
  
  const SQL = await initSqlJs();
  
  // 加载现有数据库
  let db;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log('加载现有数据库');
  } else {
    db = new SQL.Database();
    console.log('创建新数据库');
  }

  // 1. 创建 users 表
  try {
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
    console.log('✅ 创建 users 表');
  } catch (e) {
    console.log('users 表已存在');
  }

  // 2. 创建 sessions 表 (JWT 黑名单/刷新令牌)
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('✅ 创建 sessions 表');
  } catch (e) {
    console.log('sessions 表已存在');
  }

  // 3. 检查 vocabulary 表是否有 user_id 字段
  const vocabCols = db.exec("PRAGMA table_info(vocabulary)");
  const hasUserId = vocabCols[0]?.values?.some(col => col[1] === 'user_id');
  
  if (!hasUserId) {
    try {
      db.run('ALTER TABLE vocabulary ADD COLUMN user_id TEXT');
      console.log('✅ vocabulary 表添加 user_id 字段');
    } catch (e) {
      console.log('vocabulary.user_id 已存在');
    }
  } else {
    console.log('vocabulary.user_id 已存在');
  }

  // 4. 检查 exercises 表是否有 user_id 字段
  const exerCols = db.exec("PRAGMA table_info(exercises)");
  const hasExerUserId = exerCols[0]?.values?.some(col => col[1] === 'user_id');
  
  if (!hasExerUserId) {
    try {
      db.run('ALTER TABLE exercises ADD COLUMN user_id TEXT');
      console.log('✅ exercises 表添加 user_id 字段');
    } catch (e) {
      console.log('exercises.user_id 已存在');
    }
  }

  // 5. 检查 wrong_answers 表是否有 user_id 字段
  const wrongCols = db.exec("PRAGMA table_info(wrong_answers)");
  const hasWrongUserId = wrongCols[0]?.values?.some(col => col[1] === 'user_id');
  
  if (!hasWrongUserId) {
    try {
      db.run('ALTER TABLE wrong_answers ADD COLUMN user_id TEXT');
      console.log('✅ wrong_answers 表添加 user_id 字段');
    } catch (e) {
      console.log('wrong_answers.user_id 已存在');
    }
  }

  // 6. 创建索引
  try {
    db.run('CREATE INDEX IF NOT EXISTS idx_vocabulary_user_id ON vocabulary(user_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_wrong_answers_user_id ON wrong_answers(user_id)');
    console.log('✅ 创建索引');
  } catch (e) {
    console.log('索引已存在');
  }

  // 7. 创建默认管理员用户 (如果用户表为空)
  const userCount = db.exec("SELECT COUNT(*) FROM users");
  if (userCount[0]?.values?.[0]?.[0] === 0) {
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    const defaultUserId = uuidv4();
    
    db.run(`
      INSERT INTO users (id, email, password_hash, nickname, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [defaultUserId, 'admin@localhost', defaultPassword, '管理员']);
    
    console.log('✅ 创建默认管理员用户');
    console.log('   邮箱: admin@localhost');
    console.log('   密码: admin123');
    console.log('   ⚠️  请登录后立即修改密码！');

    // 将现有数据关联到默认用户
    db.run("UPDATE vocabulary SET user_id = ? WHERE user_id IS NULL", [defaultUserId]);
    db.run("UPDATE exercises SET user_id = ? WHERE user_id IS NULL", [defaultUserId]);
    db.run("UPDATE wrong_answers SET user_id = ? WHERE user_id IS NULL", [defaultUserId]);
    console.log('✅ 现有数据已关联到默认用户');
  }

  // 保存数据库
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
  
  console.log('\n🎉 v4 数据库迁移完成！');
  db.close();
}

migrate().catch(console.error);