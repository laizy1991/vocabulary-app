import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { vocabularyApi, authApi } from '@/services/api';
import { MaterialIcons } from '@expo/vector-icons';

interface Stats {
  total: number;
  todayAdded: number;
  todayReviewed: number;
  unsolvedWrongAnswers: number;
}

export default function HomeScreen() {
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await authApi.getProfile();
      // TODO: 添加 stats API
      // const statsResponse = await api.get('/stats');
      // setStats(statsResponse.data.data);
      setStats({
        total: 0,
        todayAdded: 0,
        todayReviewed: 0,
        unsolvedWrongAnswers: 0
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStats} />}
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>欢迎，{user?.nickname || '用户'}</Text>
        <Text style={styles.subText}>今天要学习什么？</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#3b82f6' }]}>
          <MaterialIcons name="library-books" size={32} color="#fff" />
          <Text style={styles.statNumber}>{stats?.total || 0}</Text>
          <Text style={styles.statLabel}>总词汇</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#10b981' }]}>
          <MaterialIcons name="add-circle" size={32} color="#fff" />
          <Text style={styles.statNumber}>{stats?.todayAdded || 0}</Text>
          <Text style={styles.statLabel}>今日新增</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#f59e0b' }]}>
          <MaterialIcons name="check-circle" size={32} color="#fff" />
          <Text style={styles.statNumber}>{stats?.todayReviewed || 0}</Text>
          <Text style={styles.statLabel}>今日复习</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#ef4444' }]}>
          <MaterialIcons name="error" size={32} color="#fff" />
          <Text style={styles.statNumber}>{stats?.unsolvedWrongAnswers || 0}</Text>
          <Text style={styles.statLabel}>待复习错题</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/vocabulary')}>
          <MaterialIcons name="add" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>添加词汇</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/learn')}>
          <MaterialIcons name="play-arrow" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>开始练习</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>快捷入口</Text>
        <View style={styles.quickLinks}>
          <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/(tabs)/vocabulary')}>
            <MaterialIcons name="book" size={28} color="#3b82f6" />
            <Text style={styles.quickLinkText}>词汇管理</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickLink}>
            <MaterialIcons name="history" size={28} color="#f59e0b" />
            <Text style={styles.quickLinkText}>错题本</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickLink}>
            <MaterialIcons name="bar-chart" size={28} color="#10b981" />
            <Text style={styles.quickLinkText}>学习统计</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    backgroundColor: '#3b82f6',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subText: {
    fontSize: 14,
    color: '#e5e7eb',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#e5e7eb',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  quickLinks: {
    flexDirection: 'row',
    gap: 12,
  },
  quickLink: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickLinkText: {
    fontSize: 14,
    color: '#374151',
    marginTop: 8,
  },
});