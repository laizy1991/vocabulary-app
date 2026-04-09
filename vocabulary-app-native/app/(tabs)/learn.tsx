import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/services/api';
import { MaterialIcons } from '@expo/vector-icons';

export default function LearnScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const startExercise = async (type: 'choice' | 'translation' | 'dictation') => {
    setLoading(true);
    try {
      const response = await api.post('/exercises/generate', { type, count: 10 });
      if (response.data.success) {
        // 跳转到练习页面
        router.push(`/learn/exercise/${response.data.data.id}`);
      }
    } catch (error: any) {
      Alert.alert('生成失败', error.response?.data?.error || '无法生成练习题');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>开始学习</Text>
        <Text style={styles.subtitle}>选择一种练习模式</Text>
      </View>

      <View style={styles.exercises}>
        <TouchableOpacity 
          style={[styles.exerciseCard, { backgroundColor: '#3b82f6' }]}
          onPress={() => startExercise('choice')}
          disabled={loading}
        >
          <MaterialIcons name="radio-button-checked" size={40} color="#fff" />
          <Text style={styles.exerciseTitle}>选择题</Text>
          <Text style={styles.exerciseDesc}>看词选释义，快速记忆</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.exerciseCard, { backgroundColor: '#10b981' }]}
          onPress={() => startExercise('translation')}
          disabled={loading}
        >
          <MaterialIcons name="translate" size={40} color="#fff" />
          <Text style={styles.exerciseTitle}>翻译题</Text>
          <Text style={styles.exerciseDesc}>中英互译，加深理解</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.exerciseCard, { backgroundColor: '#f59e0b' }]}
          onPress={() => startExercise('dictation')}
          disabled={loading}
        >
          <MaterialIcons name="keyboard" size={40} color="#fff" />
          <Text style={styles.exerciseTitle}>默写题</Text>
          <Text style={styles.exerciseDesc}>看释义写词汇</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.historyButton}
          onPress={() => router.push('/learn/wrong-answers')}
        >
          <MaterialIcons name="history" size={24} color="#ef4444" />
          <Text style={styles.historyButtonText}>错题本复习</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  exercises: {
    padding: 16,
    gap: 16,
  },
  exerciseCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  exerciseTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  exerciseDesc: {
    fontSize: 14,
    color: '#e5e7eb',
    marginTop: 8,
  },
  section: {
    padding: 16,
  },
  historyButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  historyButtonText: {
    fontSize: 16,
    color: '#ef4444',
    marginLeft: 8,
    fontWeight: '600',
  },
});