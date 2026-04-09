#!/bin/bash

# 词汇管理助手 v4 启动脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
LOG_FILE="$SCRIPT_DIR/server.log"
PID_FILE="$SCRIPT_DIR/server.pid"

# 停止已有服务
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if ps -p $OLD_PID > /dev/null 2>&1; then
    echo "停止已有服务 (PID: $OLD_PID)..."
    kill $OLD_PID
    sleep 2
  fi
  rm -f "$PID_FILE"
fi

# 启动服务
echo "启动词汇管理助手 v4..."
cd "$BACKEND_DIR"

# 复制数据库（如果不存在）
if [ ! -f "$BACKEND_DIR/vocabulary.db" ]; then
  if [ -f "$SCRIPT_DIR/../v3/backend/vocabulary.db" ]; then
    echo "复制 v3 数据库..."
    cp "$SCRIPT_DIR/../v3/backend/vocabulary.db" "$BACKEND_DIR/vocabulary.db"
  fi
fi

# 启动 Node 服务
nohup node server.js > "$LOG_FILE" 2>&1 &
NEW_PID=$!

echo $NEW_PID > "$PID_FILE"

sleep 2

# 检查是否启动成功
if ps -p $NEW_PID > /dev/null 2>&1; then
  echo "✅ 服务启动成功 (PID: $NEW_PID)"
  echo "   访问地址: http://localhost:10827"
  echo "   日志文件: $LOG_FILE"
  echo ""
  echo "默认账号："
  echo "   邮箱: admin@localhost"
  echo "   密码: admin123"
else
  echo "❌ 服务启动失败，请查看日志: $LOG_FILE"
  exit 1
fi