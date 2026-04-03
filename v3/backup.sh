#!/bin/bash
# 数据库备份脚本
# 用法: ./backup.sh [保留天数]

# 配置
APP_DIR="/home/admin/app/vocabulary-app/v3"
BACKUP_DIR="/home/admin/app/vocabulary-app/backups"
DB_FILE="$APP_DIR/backend/vocabulary.db"
KEEP_DAYS=${1:-7}  # 默认保留 7 天

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 生成备份文件名（带时间戳）
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/vocabulary_$TIMESTAMP.db"

# 备份数据库
if [ -f "$DB_FILE" ]; then
    cp "$DB_FILE" "$BACKUP_FILE"
    
    # 压缩备份
    gzip "$BACKUP_FILE"
    
    # 计算文件大小
    SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
    
    echo "✅ 备份成功: ${BACKUP_FILE}.gz ($SIZE)"
    
    # 清理旧备份（保留最近 N 天）
    find "$BACKUP_DIR" -name "vocabulary_*.db.gz" -mtime +$KEEP_DAYS -delete
    echo "🧹 已清理 $KEEP_DAYS 天前的旧备份"
    
    # 显示备份列表
    echo ""
    echo "📋 当前备份列表:"
    ls -lh "$BACKUP_DIR"/*.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
else
    echo "❌ 错误: 数据库文件不存在: $DB_FILE"
    exit 1
fi