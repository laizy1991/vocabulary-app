import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useVocabularyStore } from '@/stores/vocabularyStore';
import { vocabularyApi } from '@/services/api';
import { MaterialIcons } from '@expo/vector-icons';
import { Vocabulary } from '@/types';

export default function VocabularyScreen() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { vocabularies, setVocabularies, deleteVocabulary } = useVocabularyStore();

  const loadVocabularies = async (searchQuery?: string) => {
    setLoading(true);
    try {
      const response = await vocabularyApi.list({ search: searchQuery });
      if (response.data.success) {
        setVocabularies(response.data.data);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.replace('/(auth)/login');
      } else {
        Alert.alert('加载失败', '无法加载词汇列表');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVocabularies(search);
    setRefreshing(false);
  };

  useEffect(() => {
    loadVocabularies();
  }, []);

  const handleSearch = () => {
    loadVocabularies(search);
  };

  const handleDelete = (id: string, word: string) => {
    Alert.alert(
      '确认删除',
      `确定要删除"${word}"吗？`,
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '删除', 
          style: 'destructive',
          onPress: async () => {
            try {
              await vocabularyApi.delete(id);
              deleteVocabulary(id);
              Alert.alert('成功', '词汇已删除');
            } catch (error) {
              Alert.alert('失败', '删除失败');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: Vocabulary }) => (
    <TouchableOpacity 
      style={styles.vocabItem}
      onPress={() => router.push(`/vocabulary/${item.id}`)}
    >
      <View style={styles.vocabContent}>
        <Text style={styles.vocabWord}>{item.word}</Text>
        {item.pinyin && <Text style={styles.vocabPinyin}>{item.pinyin}</Text>}
        {item.meaning && <Text style={styles.vocabMeaning}>{item.meaning}</Text>}
      </View>
      <View style={styles.vocabActions}>
        <TouchableOpacity onPress={() => handleDelete(item.id, item.word)}>
          <MaterialIcons name="delete" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索词汇..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <MaterialIcons name="search" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={vocabularies}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="book" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>暂无词汇</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => router.push('/vocabulary/add')}>
              <Text style={styles.addButtonText}>添加词汇</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={vocabularies.length === 0 ? styles.emptyList : styles.list}
      />

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/vocabulary/add')}
      >
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  searchBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  vocabItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  vocabContent: {
    flex: 1,
  },
  vocabWord: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  vocabPinyin: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  vocabMeaning: {
    fontSize: 14,
    color: '#374151',
    marginTop: 8,
  },
  vocabActions: {
    alignItems: 'center',
    justifyContent: 'center',
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
  addButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#3b82f6',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});