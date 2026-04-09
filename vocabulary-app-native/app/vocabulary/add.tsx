import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { vocabularyApi } from '@/services/api';
import { useVocabularyStore } from '@/stores/vocabularyStore';
import { MaterialIcons } from '@expo/vector-icons';

export default function AddVocabularyScreen() {
  const [word, setWord] = useState('');
  const [meaning, setMeaning] = useState('');
  const [pinyin, setPinyin] = useState('');
  const [englishMeaning, setEnglishMeaning] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('beginner');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { addVocabulary } = useVocabularyStore();

  const generateAI = async () => {
    if (!word.trim()) {
      Alert.alert('提示', '请先输入词汇');
      return;
    }

    setGenerating(true);
    try {
      const response = await vocabularyApi.generate(word.trim());
      if (response.data.success) {
        const data = response.data.data;
        setPinyin(data.pinyin || '');
        setMeaning(data.meaning || '');
        setEnglishMeaning(data.english_meaning || '');
        setLevel(data.level || 'beginner');
        Alert.alert('成功', 'AI 已生成释义');
      } else {
        Alert.alert('失败', response.data.error || '生成失败');
      }
    } catch (error: any) {
      Alert.alert('失败', error.response?.data?.error || '网络错误');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!word.trim()) {
      Alert.alert('提示', '词汇不能为空');
      return;
    }

    setLoading(true);
    try {
      const response = await vocabularyApi.create({
        word: word.trim(),
        pinyin: pinyin.trim(),
        meaning: meaning.trim(),
        englishMeaning: englishMeaning.trim(),
        category: category.trim(),
        level
      });

      if (response.data.success) {
        addVocabulary(response.data.data);
        Alert.alert('成功', response.data.message || '词汇已保存', [
          { text: '继续添加', onPress: () => {
            setWord('');
            setMeaning('');
            setPinyin('');
            setEnglishMeaning('');
            setCategory('');
          }},
          { text: '返回列表', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('失败', response.data.error || '保存失败');
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.replace('/(auth)/login');
      } else {
        Alert.alert('失败', error.response?.data?.error || '网络错误');
      }
    } finally {
      setLoading(false);
    }
  };

  const levels = ['beginner', 'intermediate', 'advanced'];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="输入词汇"
            value={word}
            onChangeText={setWord}
            autoFocus
          />
          <TouchableOpacity 
            style={[styles.aiButton, generating && styles.buttonDisabled]} 
            onPress={generateAI}
            disabled={generating}
          >
            <MaterialIcons name="auto-fix-high" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {generating && (
          <Text style={styles.generatingText}>AI 正在生成释义...</Text>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>音标/拼音</Text>
          <TextInput
            style={styles.input}
            placeholder="音标或拼音"
            value={pinyin}
            onChangeText={setPinyin}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>中文释义</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="中文解释"
            value={meaning}
            onChangeText={setMeaning}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>英文释义</Text>
          <TextInput
            style={styles.input}
            placeholder="英文解释"
            value={englishMeaning}
            onChangeText={setEnglishMeaning}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>分类</Text>
          <TextInput
            style={styles.input}
            placeholder="例如：动词、名词、短语"
            value={category}
            onChangeText={setCategory}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>难度等级</Text>
          <View style={styles.levelButtons}>
            {levels.map(l => (
              <TouchableOpacity
                key={l}
                style={[styles.levelButton, level === l && styles.levelButtonActive]}
                onPress={() => setLevel(l)}
              >
                <Text style={[styles.levelButtonText, level === l && styles.levelButtonTextActive]}>
                  {l === 'beginner' ? '初级' : l === 'intermediate' ? '中级' : '高级'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.buttonDisabled]} 
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? '保存中...' : '保存词汇'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  form: {
    padding: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  aiButton: {
    backgroundColor: '#8b5cf6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  generatingText: {
    color: '#8b5cf6',
    textAlign: 'center',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  levelButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  levelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  levelButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  levelButtonText: {
    color: '#6b7280',
    fontSize: 14,
  },
  levelButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});