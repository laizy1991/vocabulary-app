#!/bin/bash

# 词汇管理助手 v4 停止脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/server.pid"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if ps -p $PID > /dev/null 2>&1; then
    echo "停止服务 (PID: $PID)..."
    kill $PID
    sleep 2
    
    if ps -p $PID > /dev/null 2>&1; then
      echo "强制停止..."
      kill -9 $PID
    fi
  fi
  rm -f "$PID_FILE"
  echo "✅ 服务已停止"
else
  echo "服务未运行"
fi