#!/usr/bin/env node

/**
 * 数据迁移工具 - 从 v1 (IndexedDB) 迁移到 v2 (SQLite)
 * 
 * 使用方法：
 * 1. 在浏览器中打开 v1 版本
 * 2. 在控制台运行 exportVocabularyData() 函数
 * 3. 将导出的 JSON 保存为 vocabulary-export.json
 * 4. 运行此脚本：node migrate-from-v1.js vocabulary-export.json
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// 从命令行参数获取导出文件路径
const exportFile = process.argv[2];

if (!exportFile) {
  console.log(`
词汇管理助手 - 数据迁移工具
============================

使用方法:
  node migrate-from-v1.js <导出文件路径>

步骤:
  1. 在浏览器中打开 v1 版本 (纯前端版本)
  2. 打开浏览器控制台 (F12)
  3. 运行以下函数导出你的数据:
     exportVocabularyData()
  4. 将导出的 JSON 保存为文件
  5. 运行此脚本: node migrate-from-v1.js vocabulary-export.json

或者，在浏览器控制台直接运行以下代码导出数据:

function exportVocabularyData() {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await new Promise((res, rej) => {
        const req = indexedDB.open('VocabularyApp', 1);
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
      
      const tx = db.transaction('vocabulary', 'readonly');
      const store = tx.objectStore('vocabulary');
      
      const items = [];
      await new Promise((res, rej) => {
        const request = store.openCursor();
        request.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            items.push(cursor.value);
            cursor.continue();
          } else {
            res();
          }
        };
        request.onerror = () => rej(request.error);
      });
      
      const json = JSON.stringify(items, null, 2);
      console.log('导出成功！共', items.length, '条词汇');
      console.log('请复制以下 JSON 数据并保存为文件:');
      console.log(json);
      resolve(items);
    } catch (error) {
      console.error('导出失败:', error);
      reject(error);
    }
  });
}
  `);
  process.exit(1);
}

// 检查导出文件是否存在
if (!fs.existsSync(exportFile)) {
  console.error(`错误：文件不存在 - ${exportFile}`);
  process.exit(1);
}

// 读取导出数据
let vocabularyData;
try {
  const content = fs.readFileSync(exportFile, 'utf-8');
  vocabularyData = JSON.parse(content);
  
  if (!Array.isArray(vocabularyData)) {
    throw new Error('导出的数据格式不正确，应该是数组');
  }
} catch (error) {
  console.error('错误：无法读取或解析导出文件:', error.message);
  process.exit(1);
}

console.log(`找到 ${vocabularyData.length} 条词汇数据`);

// 连接到 v2 数据库
const dbPath = path.join(__dirname, 'backend', 'vocabulary.db');
const db = new Database(dbPath);

console.log(`连接到数据库：${dbPath}`);

// 准备插入语句
const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO vocabulary (
    id, word, meaning, example, sentence, level, tags, category, notes,
    status, review_count, correct_count, last_reviewed_at, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// 迁移数据
let successCount = 0;
let failCount = 0;

const now = new Date().toISOString();

db.transaction(() => {
  vocabularyData.forEach((item, index) => {
    try {
      // 映射 v1 数据结构到 v2
      const id = item.id || `migrated-${Date.now()}-${index}`;
      const word = item.word || '';
      const meaning = item.chDef || item.meaning || '';  // v1 使用 chDef
      const example = item.example || null;
      const sentence = item.sentence || item.detail || null;
      const level = item.level || 'beginner';
      const tags = JSON.stringify(item.tags || item.combos ? [item.combos] : []);
      const category = item.category || null;
      const notes = item.notes || null;
      const status = item.status || 'new';
      const reviewCount = item.reviewCount || 0;
      const correctCount = item.correctCount || 0;
      const lastReviewedAt = item.lastReviewedAt || null;
      const createdAt = item.createdAt || now;
      
      insertStmt.run(
        id, word, meaning, example, sentence, level, tags, category, notes,
        status, reviewCount, correctCount, lastReviewedAt, createdAt, now
      );
      
      successCount++;
      if (successCount % 10 === 0) {
        console.log(`已迁移 ${successCount} 条...`);
      }
    } catch (error) {
      console.error(`迁移第 ${index + 1} 条失败:`, error.message);
      failCount++;
    }
  });
})();

console.log(`
迁移完成！
成功：${successCount} 条
失败：${failCount} 条

现在可以启动 v2 服务:
  cd backend
  npm start
`);

// 关闭数据库
db.close();
