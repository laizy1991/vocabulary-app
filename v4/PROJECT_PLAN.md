# 词汇管理助手 v4 - 多用户账号体系

## 项目目标

基于 v3 改造，添加用户账号体系，支持多用户独立使用。

## 技术栈

- **后端**: Node.js + Express (沿用v3)
- **数据库**: SQLite + sql.js (沿用v3，增加用户表)
- **认证**: JWT (jsonwebtoken)
- **密码**: bcrypt
- **前端**: 原有前端 + 登录/注册页面

## 数据库设计

### users 表
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT,
  avatar TEXT,
  created_at TEXT,
  updated_at TEXT,
  last_login_at TEXT
);
```

### vocabulary 表修改
```sql
-- 添加 user_id 字段
ALTER TABLE vocabulary ADD COLUMN user_id TEXT REFERENCES users(id);

-- 索引
CREATE INDEX idx_vocabulary_user_id ON vocabulary(user_id);
```

### 其他表修改
- exercises: 添加 user_id
- wrong_answers: 添加 user_id
- 新增 sessions 表 (JWT session 管理，可选)

## API 设计

### 认证相关
- POST /api/auth/register - 注册
- POST /api/auth/login - 登录
- POST /api/auth/logout - 登出
- GET /api/auth/me - 获取当前用户
- PUT /api/auth/profile - 更新资料

### 词汇相关 (需要认证)
- 所有现有 API 添加 user_id 过滤
- GET /api/vocabulary → 按 user_id 过滤
- POST /api/vocabulary → 自动关联 user_id

## 开发步骤

### Phase 1: 后端改造 (Day 1)
- [ ] 创建 v4 目录结构
- [ ] 添加用户表和认证中间件
- [ ] 改造现有 API 支持 user_id
- [ ] 数据迁移脚本

### Phase 2: 前端改造 (Day 2)
- [ ] 登录/注册页面
- [ ] 认证状态管理
- [ ] API 请求添加认证头
- [ ] 用户信息展示

### Phase 3: 测试与部署 (Day 3)
- [ ] 功能测试
- [ ] 数据迁移
- [ ] 部署上线

## 兼容性

- 现有数据自动关联到第一个注册用户
- 或提供数据迁移工具让用户导入