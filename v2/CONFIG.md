# 词汇管理助手 v2 - 配置说明

## 🚀 服务已启动

**访问地址：** http://localhost:10826

## ⚙️ AI 功能配置（可选）

AI 智能生成词汇信息需要配置百炼 API 密钥：

### 1. 获取 API 密钥
1. 访问 https://dashscope.console.aliyun.com/
2. 登录/注册阿里云账号
3. 进入 API-KEY 管理
4. 创建新的 API 密钥

### 2. 配置密钥

编辑 `server.js`，找到以下行（约第 16 行）：

```javascript
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || 'sk-xxxxx';
```

替换 `'sk-xxxxx'` 为你的实际 API 密钥：

```javascript
const DASHSCOPE_API_KEY = 'sk-your-actual-api-key-here';
```

### 3. 重启服务

```bash
cd /home/admin/app/vocabulary-app/v2/backend
pkill -f "node server.js"
node server.js &
```

## 📋 功能说明

### 1. AI 智能录入
- 输入词语或单词
- 点击"AI 生成"自动获取：
  - 释义
  - 例句
  - 难度等级
  - 语言类型（中文/英文）

### 2. 练习题生成
支持三种题型：
- 🎧 **听写练习**：看释义写词语
- 🔗 **中英文配对**：选择正确的释义
- 📝 **句子填空**：填写句子中的空白

### 3. 词汇管理
- 搜索和筛选（语言、难度）
- 编辑和删除
- 复习计数追踪

## 🔧 故障排除

### AI 生成失败
- 检查 API 密钥是否正确
- 确认网络连接正常
- 查看服务器日志：`cat /tmp/vocab-server.log`

### 服务无法启动
```bash
# 检查端口占用
lsof -i :10826

# 杀掉占用进程
kill -9 <PID>

# 重新启动
cd /home/admin/app/vocabulary-app/v2/backend
node server.js &
```

## 📊 数据库

- 类型：SQLite（使用 sql.js）
- 位置：`/home/admin/app/vocabulary-app/v2/backend/vocabulary.db`
- 自动保存：每 30 秒

### 备份数据库
```bash
cp /home/admin/app/vocabulary-app/v2/backend/vocabulary.db \
   /home/admin/app/vocabulary-app/v2/backend/vocabulary.db.backup.$(date +%Y%m%d)
```
