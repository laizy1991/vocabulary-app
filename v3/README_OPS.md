# 词汇管理助手 v3 - 运维文档

## 📁 目录结构

```
/home/admin/app/vocabulary-app/v3/
├── backend/
│   ├── server.js          # 后端服务
│   ├── vocabulary.db      # 数据库（所有版本共用）
│   ├── migrate.js         # 数据库迁移脚本
│   └── node_modules/      # 依赖
├── frontend/
│   ├── index.html         # 前端入口
│   └── assets/
│       ├── index-v3.js    # 前端 JS
│       └── index-v3.css   # 前端样式
├── start.sh               # 启动脚本
├── stop.sh                # 停止脚本
├── upgrade.sh             # 升级脚本（保留数据库）
├── server.pid             # 进程 ID 文件
├── server.log             # 日志文件
└── package.json           # 项目配置

/home/admin/app/vocabulary-app/backups/
└── v3_code_YYYYMMDD_HHMMSS/  # 代码备份（用于回滚）
```

## 💾 数据库策略（重要！）

**核心原则：**
- ✅ **所有版本共用一个数据库**：`/home/admin/app/vocabulary-app/v3/backend/vocabulary.db`
- ✅ **升级时数据不丢失**：保留所有历史词汇和学习记录
- ✅ **数据库结构自动演进**：迁移脚本自动添加新字段
- ✅ **向后兼容**：只添加新列，不删除旧列

**升级流程：**
1. 备份当前代码（用于回滚）
2. 停止旧服务
3. 更新代码
4. **保留数据库文件**
5. 执行数据库迁移（添加新字段）
6. 启动新服务

---

## 🚀 常用命令

### 启动服务
```bash
/home/admin/app/vocabulary-app/v3/start.sh
```

### 停止服务
```bash
/home/admin/app/vocabulary-app/v3/stop.sh
```

### 重启服务
```bash
/home/admin/app/vocabulary-app/v3/stop.sh
/home/admin/app/vocabulary-app/v3/start.sh
```

### 查看日志
```bash
tail -f /home/admin/app/vocabulary-app/v3/server.log
```

### 查看服务状态
```bash
ps aux | grep "vocabulary-app/v3"
```

---

## 🔄 升级流程（数据永存）

### 方式一：使用升级脚本（推荐）

```bash
/home/admin/app/vocabulary-app/v3/upgrade.sh
```

**升级脚本自动完成：**
1. ✅ 备份当前代码到 `/home/admin/app/vocabulary-app/backups/`
2. ✅ 停止旧服务
3. ✅ 更新代码（如果是 git 仓库则 `git pull`）
4. ✅ 更新依赖
5. ✅ **保留数据库文件**（不备份、不覆盖）
6. ✅ 执行数据库迁移（`migrate.js` 自动添加新字段）
7. ✅ 启动新服务
8. ✅ 检查服务状态（失败则回滚代码，数据库保持）

### 方式二：手动升级

1. **停止服务**
```bash
/home/admin/app/vocabulary-app/v3/stop.sh
```

2. **更新代码**
```bash
cd /home/admin/app/vocabulary-app/v3
git pull  # 或手动替换文件
```

3. **更新依赖**
```bash
cp -r /home/admin/app/vocabulary-app/v2/backend/node_modules backend/
npm install --production
```

4. **执行数据库迁移**
```bash
node backend/migrate.js
```

5. **启动服务**
```bash
/home/admin/app/vocabulary-app/v3/start.sh
```

---

## 💾 数据备份（可选）

虽然升级过程会保留数据库，但建议定期备份以防万一：

### 手动备份数据库
```bash
# 备份
cp /home/admin/app/vocabulary-app/v3/backend/vocabulary.db \
   ~/vocabulary_backup_$(date +%Y%m%d).db

# 恢复（仅在数据损坏时使用）
/home/admin/app/vocabulary-app/v3/stop.sh
cp ~/vocabulary_backup_20260402.db \
   /home/admin/app/vocabulary-app/v3/backend/vocabulary.db
/home/admin/app/vocabulary-app/v3/start.sh
```

### 自动备份（可选）
```bash
# 每周日凌晨 3 点备份
crontab -e

# 添加以下行
0 3 * * 0 cp /home/admin/app/vocabulary-app/v3/backend/vocabulary.db /home/admin/app/vocabulary-app/backups/vocabulary_db_$(date +\%Y\%m\%d).db
```

---

## 🛠️ 故障排查

### 服务无法启动

1. **检查端口占用**
```bash
netstat -tlnp | grep 10826
# 或
ss -tlnp | grep 10826
```

2. **停止占用进程**
```bash
kill -9 <PID>
```

3. **查看日志**
```bash
cat /home/admin/app/vocabulary-app/v3/server.log
```

### 数据库损坏

1. **从备份恢复**
```bash
ls -la /home/admin/app/vocabulary-app/backups/
/home/admin/app/vocabulary-app/v3/stop.sh
cp /home/admin/app/vocabulary-app/backups/vocabulary_db_最新备份.db \
   /home/admin/app/vocabulary-app/v3/backend/vocabulary.db
/home/admin/app/vocabulary-app/v3/start.sh
```

2. **执行数据库迁移**
```bash
node /home/admin/app/vocabulary-app/v3/backend/migrate.js
```

### 服务异常

1. **查看进程**
```bash
ps aux | grep "node.*server.js"
```

2. **重启服务**
```bash
/home/admin/app/vocabulary-app/v3/stop.sh
/home/admin/app/vocabulary-app/v3/start.sh
```

3. **查看详细日志**
```bash
tail -100 /home/admin/app/vocabulary-app/v3/server.log
```

---

## 📊 服务信息

- **端口**: 10826（固定）
- **访问地址**: http://localhost:10826
- **数据库路径**: `/home/admin/app/vocabulary-app/v3/backend/vocabulary.db`（所有版本共用）
- **迁移脚本**: `/home/admin/app/vocabulary-app/v3/backend/migrate.js`
- **代码备份**: `/home/admin/app/vocabulary-app/backups/`
- **日志文件**: `/home/admin/app/vocabulary-app/v3/server.log`

---

## ⚠️ 注意事项

1. **数据库共用** - 所有版本共用一个数据库文件，升级时自动保留数据
2. **结构自动演进** - 迁移脚本会自动添加新字段，不会删除旧数据
3. **不要手动修改数据库结构** - 使用 `migrate.js` 统一管理结构变更
4. **升级后验证服务** - 访问 http://localhost:10826 确认服务正常
5. **定期备份（可选）** - 建议每周备份一次，以防硬件故障
6. **回滚只回滚代码** - 数据库保持当前状态，确保数据不丢失

---

## 📞 支持

如有问题，请查看：
- 日志文件：`/home/admin/app/vocabulary-app/v3/server.log`
- 备份目录：`/home/admin/app/vocabulary-app/backups/`
