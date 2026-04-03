#!/bin/bash

# 词汇管理助手 v3 停止脚本

APP_DIR="/home/admin/app/vocabulary-app/v3"
PID_FILE="$APP_DIR/server.pid"

echo "⏹️  正在停止词汇管理助手 v3..."

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p $PID > /dev/null 2>&1; then
        kill $PID 2>/dev/null
        sleep 1
        echo "✅ 服务已停止 (PID: $PID)"
        rm -f "$PID_FILE"
    else
        echo "⚠️  服务未运行"
        rm -f "$PID_FILE"
    fi
else
    # 尝试查找并停止进程
    pkill -f "node.*v3.*server.js" 2>/dev/null && echo "✅ 服务已停止" || echo "⚠️  未找到运行中的服务"
fi
