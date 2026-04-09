import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { vocabularyApi } from '@/services/api';
import { useVocabularyStore } from '@/stores/vocabularyStore';
import { MaterialIcons } from '@expo/vector-icons';
import { Vocabulary } from '@/types';

export default function VocabularyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [vocab, setVocab] = useState<Vocabulary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVocab();
  }, [id]);

  const loadVocab = async () => {
    setLoading(true);
    try {
      const response = await vocabularyApi.get(id);
      if (response.data.success) {
        setVocab(response.data.data);
      } else {
        Alert.alert('错误', '词汇不存在');
        router.back();
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.replace('/(auth)/login');
      } else {
        Alert.alert('错误', '加载失败');
        router.back();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '确认删除',
      `确定要删除"${vocab?.word}"吗？`,
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '删除', 
          style: 'destructive',
          onPress: async () => {
            try {
              await vocabularyApi.delete(id);
              useVocabularyStore.getState().deleteVocabulary(id);
              router.back();
            } catch (error) {
              Alert.alert('失败', '删除失败');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text>加载中...</Text>
      </View>
    );
  }

  if (!vocab) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.word}>{vocab.word}</Text>
        {vocab.pinyin && <Text style={styles.pinyin}>{vocab.pinyin}</Text>}
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>
            {vocab.level === 'beginner' ? '初级' : 
             vocab.level === 'intermediate' ? '中级' : '高级'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>中文释义</Text>
        <Text style={styles.content}>{vocab.meaning || '暂无'}</Text>
      </View>

      {vocab.english_meaning && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>英文释义</Text>
          <Text style={styles.content}>{vocab.english_meaning}</Text>
        </View>
      )}

      {vocab.detail && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>详细说明</Text>
          <Text style={styles.content}>{vocab.detail}</Text>
        </View>
      )}

      {vocab.phrases && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>常用短语</Text>
          <Text style={styles.content}>{vocab.phrases}</Text>
        </View>
      )}

      {vocab.sentences && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>例句</Text>
          <Text style={styles.content}>{vocab.sentences}</Text>
        </View>
      )}

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>复习次数</Text>
          <Text style={styles.statValue}>{vocab.review_count || 0}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>正确次数</Text>
          <Text style={styles.statValue}>{vocab.correct_count || 0}</Text>
        </View>
        {vocab.last_reviewed_at && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>上次复习</Text>
            <Text style={styles.statValue}>
              {new Date(vocab.last_reviewed_at).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push(`/vocabulary/edit/${id}`)}>
          <MaterialIcons name="edit" size={20} color="#3b82f6" />
          <Text style={styles.actionButtonText}>编辑</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete}>
          <MaterialIcons name="delete" size={20} color="#ef4444" />
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>删除</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.meta}>
        <Text style={styles.metaText}>
          创建于 {vocab.created_at ? new Date(vocab.created_at).toLocaleDateString() : '未知'}
        </Text>
        <Text style={styles.metaText}>
          {vocab.category && `分类: ${vocab.category}`}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  word: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  pinyin: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
  levelBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 12,
  },
  levelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  content: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  stats: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 12,
    gap: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  actionButtonText: {
    color: '#3b82f6',
    marginLeft: 8,
    fontWeight: '600',
  },
  deleteButton: {
    borderColor: '#ef4444',
  },
  deleteButtonText: {
    color: '#ef4444',
  },
  meta: {
    padding: 16,
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});