# 词汇管理助手 - 版本演进说明

## 📊 数据库策略

**核心原则：数据永存，结构演进**

- ✅ 所有版本共用一个数据库文件
- ✅ 升级时保留所有历史数据
- ✅ 数据库结构自动迁移
- ✅ 向后兼容，只增不减

---

## 📦 版本历史

### v3.0.0 (当前版本)

**发布时间**: 2026-04-02

**新功能**:
- 🎯 AI 智能录入：用户只需输入词汇，AI 自动填充所有字段
- 📱 顶部 3 Tab 架构：首页 / 词汇 / 复习
- 📊 首页数据概览：总词汇量、今日录入、今日复习
- 📝 完整词汇字段：拼音、中文释义、英文释义、详细说明、组词、例句
- 🔍 词汇分页检索：支持关键词、语言、难度筛选
- ✏️ 多题型复习：看释义写词语、中英互译、看词选释义

**数据库结构**:
```sql
CREATE TABLE vocabulary (
  id TEXT PRIMARY KEY,
  word TEXT NOT NULL,
  pinyin TEXT,              -- v3 新增
  meaning TEXT,
  english_meaning TEXT,     -- v3 新增
  detail TEXT,              -- v3 新增
  phrases TEXT,             -- v3 新增
  sentences TEXT,           -- v3 新增
  level TEXT DEFAULT 'beginner',
  category TEXT,            -- v3 新增
  status TEXT DEFAULT 'new',
  review_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  last_reviewed_at TEXT,
  language TEXT DEFAULT 'auto',
  ai_generated INTEGER DEFAULT 0,  -- v3 新增
  created_at TEXT,
  updated_at TEXT
);
```

**迁移说明**:
- 从 v2 升级：自动添加 `pinyin`, `english_meaning`, `detail`, `phrases`, `sentences`, `category`, `ai_generated` 列
- 数据保留：所有已有词汇完整保留
- 兼容性：v2 数据完全兼容

---

### v2.0.0

**发布时间**: 2026-04-01

**功能**:
- 📚 词汇管理：添加、编辑、删除词汇
- 🤖 AI 智能生成：自动生成释义、例句、难度
- ✍️ 练习题生成：听写、配对、填空
- 📊 统计分析：按语言、难度、状态统计

**数据库结构**:
```sql
CREATE TABLE vocabulary (
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
);
```

---

## 🔄 迁移机制

### 自动迁移

升级时自动执行 `backend/migrate.js`：

1. **检查表是否存在** - 不存在则创建
2. **检查列是否存在** - 不存在则添加
3. **保留所有数据** - 绝不删除列或数据
4. **保存变更** - 导出并保存数据库

### 手动迁移

```bash
cd /home/admin/app/vocabulary-app/v3/backend
node migrate.js
```

---

## 📈 未来版本规划

### v3.1.0 (计划中)

**计划功能**:
- 📅 艾宾浩斯记忆曲线复习计划
- 🏆 学习成就系统
- 📱 移动端优化
- 🔔 学习提醒

**数据库变更**:
```sql
-- 新增学习计划表
CREATE TABLE study_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  vocab_id TEXT,
  review_interval INTEGER,
  next_review_at TEXT,
  status TEXT,
  created_at TEXT
);

-- 新增成就表
CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  icon TEXT,
  unlocked_at TEXT
);
```

### v3.2.0 (计划中)

**计划功能**:
- 📤 导入导出（Excel、CSV、Anki）
- 🌐 多用户支持
- ☁️ 数据同步

---

## ⚠️ 升级注意事项

### 从 v2 升级到 v3

1. **数据自动保留** - 无需手动备份
2. **结构自动迁移** - 运行 `upgrade.sh` 即可
3. **兼容性** - v2 数据完全兼容 v3

### 从 v1 升级到 v3

1. **建议先升级到 v2** - 确保数据完整
2. **再升级到 v3** - 享受新功能

### 回滚

```bash
# 回滚代码（数据库保持当前状态）
cp -r /home/admin/app/vocabulary-app/backups/v3_code_最新备份/* \
   /home/admin/app/vocabulary-app/v3/

# 重启服务
/home/admin/app/vocabulary-app/v3/stop.sh
/home/admin/app/vocabulary-app/v3/start.sh
```

---

## 📞 问题反馈

如遇数据库迁移问题：

1. 查看日志：`cat /home/admin/app/vocabulary-app/v3/server.log`
2. 检查数据库：`node /home/admin/app/vocabulary-app/v3/backend/migrate.js`
3. 回滚代码：使用备份恢复

---

**最后更新**: 2026-04-02
