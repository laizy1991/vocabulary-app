# 词汇管理助手 v2 - 服务端存储版本

## 主要改进

v2 版本将数据存储从客户端 IndexedDB 迁移到服务端数据库，确保：
- ✅ 数据持久化（不依赖浏览器缓存）
- ✅ 多设备同步（未来扩展）
- ✅ 数据备份和恢复
- ✅ 更好的数据安全性

## 目录结构

```
v2/
├── backend/           # 后端服务
│   ├── server.js      # Express 服务器
│   ├── package.json   # 依赖配置
│   └── vocabulary.db  # SQLite 数据库（运行时创建）
├── frontend/          # 前端文件
│   ├── index.html     # 入口 HTML
│   └── assets/        # 静态资源
│       ├── api.js     # API 客户端
│       ├── index-v2.js    # 应用逻辑（需从 v1 修改）
│       └── index-v2.css   # 样式（可从 v1 复制）
└── README.md          # 本文档
```

## 快速开始

### 1. 启动后端服务

```bash
cd /home/admin/app/vocabulary-app/v2/backend
npm install
npm start
```

服务将运行在 `http://localhost:3001`

### 2. 配置前端

修改 `frontend/index.html` 中的 API 地址：

```html
<script>
  window.API_BASE_URL = 'http://localhost:3001/api';
</script>
```

### 3. 数据迁移（从 v1 到 v2）

运行迁移脚本将 IndexedDB 数据导出并导入到服务端：

```bash
node migrate-from-v1.js
```

## API 端点

### 词汇管理

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/vocabulary` | 获取所有词汇（支持查询参数：category, level, status, search） |
| GET | `/api/vocabulary/:id` | 获取单个词汇 |
| POST | `/api/vocabulary` | 创建新词汇 |
| PUT | `/api/vocabulary/:id` | 更新词汇 |
| DELETE | `/api/vocabulary/:id` | 删除词汇 |
| POST | `/api/vocabulary/batch` | 批量导入词汇 |

### 分类管理

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/categories` | 获取所有分类 |
| POST | `/api/categories` | 创建新分类 |

### 统计信息

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/stats` | 获取统计信息 |

### 健康检查

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/health` | 服务健康检查 |

## 数据模型

### Vocabulary（词汇）

```json
{
  "id": "uuid",
  "word": "字符串（必填）",
  "meaning": "字符串（必填）",
  "example": "字符串（可选）",
  "sentence": "字符串（可选）",
  "level": "beginner|intermediate|advanced",
  "tags": ["标签数组"],
  "category": "分类名称",
  "notes": "备注",
  "status": "new|learning|mastered",
  "reviewCount": 数字，
  "correctCount": 数字，
  "lastReviewedAt": "ISO 日期字符串",
  "createdAt": "ISO 日期字符串",
  "updatedAt": "ISO 日期字符串"
}
```

### Category（分类）

```json
{
  "id": "uuid",
  "name": "分类名称",
  "color": "颜色代码",
  "createdAt": "ISO 日期字符串"
}
```

## 从 v1 迁移

### 手动迁移步骤

1. 在 v1 版本中导出所有数据（如果支持）
2. 启动 v2 后端服务
3. 使用迁移工具导入数据

### 自动迁移脚本

创建 `migrate-from-v1.js` 脚本：

```javascript
// 需要使用 Puppeteer 或类似工具访问 v1 页面并导出数据
// 或者手动从浏览器 IndexedDB 导出数据
```

## 部署建议

### 生产环境配置

1. 设置环境变量：
   ```bash
   export PORT=3001
   export NODE_ENV=production
   ```

2. 使用 PM2 管理进程：
   ```bash
   npm install -g pm2
   pm2 start server.js --name vocabulary-app
   pm2 save
   pm2 startup
   ```

3. 配置 Nginx 反向代理：
   ```nginx
   location /api/ {
     proxy_pass http://localhost:3001/api/;
     proxy_set_header Host $host;
     proxy_set_header X-Real-IP $remote_addr;
   }
   ```

## 备份数据库

SQLite 数据库文件位于 `backend/vocabulary.db`

定期备份：
```bash
cp backend/vocabulary.db backup/vocabulary-$(date +%Y%m%d).db
```

## 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   lsof -i :3001
   kill -9 <PID>
   ```

2. **数据库锁定**
   - 关闭所有连接
   - 删除 `vocabulary.db` 重启服务（会丢失数据，先备份）

3. **CORS 错误**
   - 确保后端 `cors` 中间件正确配置
   - 检查前端请求的 origin

## 开发

### 添加新功能

1. 在后端 `server.js` 添加 API 端点
2. 在前端 `api.js` 添加对应的客户端方法
3. 更新应用逻辑调用新 API

### 测试 API

```bash
# 获取所有词汇
curl http://localhost:3001/api/vocabulary

# 创建词汇
curl -X POST http://localhost:3001/api/vocabulary \
  -H "Content-Type: application/json" \
  -d '{"word":"hello","meaning":"你好"}'
```

## 版本历史

- **v2.0.0** - 服务端存储版本
  - 使用 SQLite 数据库
  - RESTful API
  - 数据持久化

- **v1.0.0** - 初始版本
  - 纯前端
  - IndexedDB 存储
