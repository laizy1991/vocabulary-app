#!/bin/bash

# 词汇管理助手 v4 数据迁移脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

echo "开始 v4 数据迁移..."

cd "$BACKEND_DIR"

# 检查数据库是否存在
if [ ! -f "vocabulary.db" ]; then
  if [ -f "$SCRIPT_DIR/../v3/backend/vocabulary.db" ]; then
    echo "复制 v3 数据库..."
    cp "$SCRIPT_DIR/../v3/backend/vocabulary.db" "vocabulary.db"
  else
    echo "数据库不存在，将创建新数据库"
  fi
fi

# 运行迁移脚本
node migrate-v4.js

echo ""
echo "✅ 数据迁移完成"