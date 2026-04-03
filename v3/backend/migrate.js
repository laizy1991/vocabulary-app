/**
 * 数据库迁移脚本
 * 
 * 作用：在升级时自动更新数据库结构，保留所有历史数据
 * 使用：node migrate.js
 * 
 * 迁移策略：
 * 1. 检查表是否存在，不存在则创建
 * 2. 检查列是否存在，不存在则添加
 * 3. 绝不删除已有列或数据
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'vocabulary.db');

async function migrate() {
  console.log('🔄 开始数据库迁移...');
  
  const SQL = await initSqlJs();
  let db;
  
  // 加载现有数据库
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log('✅ 加载现有数据库');
  } else {
    console.log('ℹ️  数据库不存在，将创建新数据库');
    db = new SQL.Database();
  }
  
  let changes = 0;
  
  try {
    // ========== 词汇表迁移 ==========
    console.log('📋 检查 vocabulary 表...');
    
    // 检查表是否存在
    let tableExists = false;
    try {
      const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vocabulary'");
      tableExists = stmt.step();
      stmt.free();
    } catch (e) {}
    
    if (!tableExists) {
      console.log('  创建 vocabulary 表...');
      db.run(`
        CREATE TABLE vocabulary (
          id TEXT PRIMARY KEY,
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
          updated_at TEXT
        )
      `);
      changes++;
      console.log('  ✅ vocabulary 表创建成功');
    } else {
      console.log('  ✅ vocabulary 表已存在');
      
      // 检查并添加新列（按需添加）
      const columnsToAdd = [
        { name: 'pinyin', type: 'TEXT' },
        { name: 'english_meaning', type: 'TEXT' },
        { name: 'detail', type: 'TEXT' },
        { name: 'phrases', type: 'TEXT' },
        { name: 'sentences', type: 'TEXT' },
        { name: 'category', type: 'TEXT' },
        { name: 'ai_generated', type: 'INTEGER' }
      ];
      
      columnsToAdd.forEach(col => {
        try {
          const stmt = db.prepare(`PRAGMA table_info(vocabulary)`);
          let columnExists = false;
          while (stmt.step()) {
            const row = stmt.getAsObject();
            if (row.name === col.name) {
              columnExists = true;
              break;
            }
          }
          stmt.free();
          
          if (!columnExists) {
            console.log(`  添加列：${col.name}...`);
            db.run(`ALTER TABLE vocabulary ADD COLUMN ${col.name} ${col.type}`);
            changes++;
            console.log(`  ✅ 列 ${col.name} 添加成功`);
          }
        } catch (e) {
          console.log(`  ⚠️  列 ${col.name} 检查失败：${e.message}`);
        }
      });
    }
    
    // ========== 练习题表迁移 ==========
    console.log('📋 检查 exercises 表...');
    
    let exercisesTableExists = false;
    try {
      const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='exercises'");
      exercisesTableExists = stmt.step();
      stmt.free();
    } catch (e) {}
    
    if (!exercisesTableExists) {
      console.log('  创建 exercises 表...');
      db.run(`
        CREATE TABLE exercises (
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
      changes++;
      console.log('  ✅ exercises 表创建成功');
    } else {
      console.log('  ✅ exercises 表已存在');
    }
    
    // 保存数据库
    if (changes > 0) {
      console.log('💾 保存数据库变更...');
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
      console.log(`✅ 数据库迁移完成，共 ${changes} 处变更`);
    } else {
      console.log('✅ 数据库已是最新版本，无需迁移');
    }
    
    // 显示统计信息
    try {
      const stmt = db.prepare('SELECT COUNT(*) as count FROM vocabulary');
      if (stmt.step()) {
        const row = stmt.getAsObject();
        console.log(`📊 当前词汇数量：${row.count}`);
      }
      stmt.free();
    } catch (e) {}
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    db.close();
  }
  
  console.log('🎉 迁移完成！');
}

migrate();
