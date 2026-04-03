#!/bin/bash

# 词汇管理助手 v3 启动脚本

APP_DIR="/home/admin/app/vocabulary-app/v3"
PID_FILE="$APP_DIR/server.pid"
LOG_FILE="$APP_DIR/server.log"

cd $APP_DIR

# 检查是否已运行
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo "服务已在运行 (PID: $OLD_PID)"
        exit 0
    fi
fi

# 启动服务
echo "正在启动词汇管理助手 v3..."
nohup node backend/server.js > "$LOG_FILE" 2>&1 &
NEW_PID=$!

# 保存 PID
echo $NEW_PID > "$PID_FILE"

# 等待服务启动
sleep 2

# 检查是否启动成功
if ps -p $NEW_PID > /dev/null 2>&1; then
    echo "✅ 服务启动成功 (PID: $NEW_PID)"
    echo "🌐 访问地址：http://localhost:10826"
    echo "📄 日志文件：$LOG_FILE"
else
    echo "❌ 服务启动失败，请检查日志：$LOG_FILE"
    exit 1
fi
