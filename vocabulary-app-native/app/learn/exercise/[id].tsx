import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '@/services/api';
import { MaterialIcons } from '@expo/vector-icons';

interface Question {
  id: number;
  type: string;
  prompt: string;
  pinyin?: string;
  options?: string[];
  answer: string;
  vocabularyId: string;
}

interface Exercise {
  id: string;
  type: string;
  questions: Question[];
}

export default function ExerciseScreen() {
  const { id: exerciseId } = useLocalSearchParams<{ id: string }>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadExercise();
  }, [exerciseId]);

  useEffect(() => {
    // Reset state for each question
    setSelectedOption(null);
    setTextAnswer('');
  }, [currentIndex]);

  const loadExercise = async () => {
    setLoading(true);
    try {
      // 先生成练习题
      const genResponse = await api.post('/exercises/generate', { 
        type: 'choice', 
        count: 10 
      });
      
      if (genResponse.data.success) {
        setExercise({
          id: genResponse.data.data.id,
          type: genResponse.data.data.type,
          questions: genResponse.data.data.questions
        });
      }
    } catch (error: any) {
      Alert.alert('错误', '生成练习题失败');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = exercise?.questions?.[currentIndex];

  const handleAnswer = () => {
    let answer: string;
    
    if (currentQuestion?.type === 'choice' || currentQuestion?.type === 'translation') {
      if (selectedOption === null) {
        Alert.alert('提示', '请选择答案');
        return;
      }
      answer = currentQuestion.options?.[selectedOption] || '';
    } else {
      if (!textAnswer.trim()) {
        Alert.alert('提示', '请输入答案');
        return;
      }
      answer = textAnswer.trim();
    }

    setAnswers(prev => [...prev, answer]);
    
    if (currentIndex < exercise!.questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      submitAnswers([...answers, answer]);
    }
  };

  const submitAnswers = async (allAnswers: string[]) => {
    setSubmitting(true);
    try {
      const response = await api.post(`/exercises/${exercise!.id}/submit`, {
        answers: allAnswers
      });

      if (response.data.success) {
        const result = response.data.data;
        router.push({
          pathname: '/learn/result',
          params: {
            score: result.score,
            total: result.totalQuestions,
            correct: result.correctCount
          }
        });
      }
    } catch (error: any) {
      Alert.alert('错误', '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text>生成练习题中...</Text>
      </View>
    );
  }

  if (!exercise || !currentQuestion) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.progress}>
          {currentIndex + 1} / {exercise.questions.length}
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((currentIndex + 1) / exercise.questions.length) * 100}%` }
            ]} 
          />
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{currentQuestion.prompt}</Text>
          {currentQuestion.pinyin && (
            <Text style={styles.pinyin}>{currentQuestion.pinyin}</Text>
          )}
        </View>

        {(currentQuestion.type === 'choice' || currentQuestion.type === 'translation') ? (
          <View style={styles.options}>
            {currentQuestion.options?.map((option, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.optionButton,
                  selectedOption === idx && styles.optionButtonSelected
                ]}
                onPress={() => setSelectedOption(idx)}
              >
                <View style={[
                  styles.optionRadio,
                  selectedOption === idx && styles.optionRadioSelected
                ]}>
                  {selectedOption === idx && (
                    <View style={styles.optionRadioInner} />
                  )}
                </View>
                <Text style={[
                  styles.optionText,
                  selectedOption === idx && styles.optionTextSelected
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <TextInput
            style={styles.textInput}
            placeholder="输入你的答案"
            value={textAnswer}
            onChangeText={setTextAnswer}
            autoFocus
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.nextButton, submitting && styles.buttonDisabled]}
          onPress={handleAnswer}
          disabled={submitting}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex < exercise.questions.length - 1 ? '下一题' : '完成'}
          </Text>
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  progress: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
  },
  progressFill: {
    height: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  questionCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  pinyin: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  options: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  optionButtonSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioSelected: {
    borderColor: '#3b82f6',
  },
  optionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
  },
  optionTextSelected: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  nextButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});