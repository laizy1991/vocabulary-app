import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/services/api';
import { MaterialIcons } from '@expo/vector-icons';

interface WrongAnswer {
  id: string;
  vocabulary_id: string;
  word: string;
  meaning: string;
  question_type: string;
  user_answer: string;
  correct_answer: string;
  created_at: string;
  solved: boolean;
}

export default function WrongAnswersScreen() {
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadWrongAnswers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/wrong-answers', { params: { unsolvedOnly: 'true' } });
      if (response.data.success) {
        setWrongAnswers(response.data.data);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.replace('/(auth)/login');
      } else {
        Alert.alert('错误', '加载失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWrongAnswers();
    setRefreshing(false);
  };

  useEffect(() => {
    loadWrongAnswers();
  }, []);

  const handleSolve = async (id: string, word: string) => {
    Alert.alert(
      '标记已掌握',
      `确定要将"${word}"标记为已掌握吗？`,
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '确定', 
          onPress: async () => {
            try {
              await api.put(`/wrong-answers/${id}/solve`);
              setWrongAnswers(prev => prev.filter(w => w.id !== id));
              Alert.alert('成功', '已标记为掌握');
            } catch (error) {
              Alert.alert('失败', '操作失败');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: WrongAnswer }) => (
    <View style={styles.item}>
      <View style={styles.itemHeader}>
        <Text style={styles.word}>{item.word}</Text>
        <Text style={styles.type}>
          {item.question_type === 'choice' ? '选择题' : 
           item.question_type === 'translation' ? '翻译题' : '默写题'}
        </Text>
      </View>

      <View style={styles.answers}>
        <View style={[styles.answerRow, styles.wrong]}>
          <Text style={styles.answerLabel}>你的答案:</Text>
          <Text style={styles.answerText}>{item.user_answer}</Text>
        </View>
        <View style={[styles.answerRow, styles.correct]}>
          <Text style={styles.answerLabel}>正确答案:</Text>
          <Text style={styles.answerText}>{item.correct_answer}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.solveButton}
        onPress={() => handleSolve(item.id, item.word)}
      >
        <MaterialIcons name="check-circle" size={20} color="#10b981" />
        <Text style={styles.solveButtonText}>标记已掌握</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={wrongAnswers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="check-circle" size={64} color="#10b981" />
            <Text style={styles.emptyText}>太棒了！没有待复习的错题</Text>
          </View>
        }
        contentContainerStyle={wrongAnswers.length === 0 ? styles.emptyList : styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  item: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  word: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  type: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: 4,
    borderRadius: 4,
  },
  answers: {
    marginBottom: 12,
  },
  answerRow: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  wrong: {
    backgroundColor: '#fee2e2',
  },
  correct: {
    backgroundColor: '#d1fae5',
  },
  answerLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  answerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  solveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  solveButtonText: {
    color: '#10b981',
    marginLeft: 8,
    fontWeight: '600',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
});