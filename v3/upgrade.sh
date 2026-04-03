#!/bin/bash

# 词汇管理助手 v3 升级脚本
# 核心原则：数据库共用，结构演进，数据永存

APP_DIR="/home/admin/app/vocabulary-app/v3"
BACKUP_DIR="/home/admin/app/vocabulary-app/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🔄 开始升级词汇管理助手 v3..."
echo "⏰ 时间：$(date)"

# 1. 创建备份目录（仅用于代码备份，数据库不备份到版本目录）
mkdir -p "$BACKUP_DIR"

# 2. 备份当前代码（用于回滚）
BACKUP_CODE="$BACKUP_DIR/v3_code_$TIMESTAMP"
if [ -d "$APP_DIR" ]; then
    echo "📦 备份当前代码..."
    cp -r "$APP_DIR" "$BACKUP_CODE" --exclude='backups' --exclude='node_modules'
    echo "✅ 代码已备份：$BACKUP_CODE"
fi

# 3. 停止服务
PID_FILE="$APP_DIR/server.pid"
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo "⏹️  正在停止旧服务 (PID: $OLD_PID)..."
        kill $OLD_PID 2>/dev/null
        sleep 2
    fi
fi

# 4. 更新代码（从 git 或新包）
echo "📝 更新代码..."
if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR"
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || echo "⚠️ git 拉取失败，请手动更新"
fi

# 5. 更新依赖
echo "📦 更新依赖..."
cd "$APP_DIR"
if [ -f "package.json" ]; then
    if [ -d "/home/admin/app/vocabulary-app/v2/backend/node_modules" ]; then
        cp -r /home/admin/app/vocabulary-app/v2/backend/node_modules "$APP_DIR/backend/" 2>/dev/null
    fi
    npm install --production 2>/dev/null || echo "⚠️ npm install 失败，使用现有依赖"
fi

# 6. 【重要】数据库迁移
# 数据库位置：/home/admin/app/vocabulary-app/v3/backend/vocabulary.db
# 所有版本共用这一个数据库文件，升级时保留数据，只更新结构
DB_FILE="$APP_DIR/backend/vocabulary.db"
MIGRATE_SCRIPT="$APP_DIR/backend/migrate.js"

if [ -f "$DB_FILE" ]; then
    echo "✅ 数据库文件保留：$DB_FILE"
    echo "📊 数据将继续使用，不会被覆盖或删除"
    
    # 如果有迁移脚本，执行数据库结构升级
    if [ -f "$MIGRATE_SCRIPT" ]; then
        echo "🔄 执行数据库迁移..."
        node "$MIGRATE_SCRIPT" || echo "⚠️ 数据库迁移失败，但服务仍可启动"
    fi
else
    echo "⚠️ 数据库文件不存在，首次启动将自动创建"
fi

# 7. 启动服务
echo "🚀 启动服务..."
cd "$APP_DIR"
nohup node backend/server.js > "$APP_DIR/server.log" 2>&1 &
NEW_PID=$!
echo $NEW_PID > "$PID_FILE"

sleep 2

# 8. 检查服务状态
if ps -p $NEW_PID > /dev/null 2>&1; then
    echo "✅ 升级完成！服务已启动 (PID: $NEW_PID)"
    echo "🌐 访问地址：http://localhost:10826"
    echo "💾 数据库：$DB_FILE（数据已保留）"
    echo "📄 日志：$APP_DIR/server.log"
else
    echo "❌ 服务启动失败！"
    echo "📄 检查日志：$APP_DIR/server.log"
    echo "🔄 尝试回滚到旧版本..."
    
    # 回滚代码（但不回滚数据库）
    if [ -d "$BACKUP_CODE" ]; then
        cp -r "$BACKUP_CODE"/* "$APP_DIR/" --exclude='backups'
        echo "⚠️ 已回滚代码，数据库保持当前状态"
        echo "⚠️ 请检查问题后重新升级"
    fi
    exit 1
fi

echo ""
echo "📝 升级说明："
echo "   - 代码备份：$BACKUP_CODE"
echo "   - 数据库：$DB_FILE（保留所有历史数据）"
echo "   - 如需回滚代码：cp -r $BACKUP_CODE/* $APP_DIR/"
echo "   - 数据库结构会自动随版本演进"
