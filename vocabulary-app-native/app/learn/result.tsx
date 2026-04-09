import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function ResultScreen() {
  const { score, total, correct } = useLocalSearchParams<{ 
    score: string; 
    total: string;
    correct: string;
  }>();

  const scoreNum = parseInt(score || '0');
  const totalNum = parseInt(total || '0');
  const correctNum = parseInt(correct || '0');

  const getEmoji = () => {
    if (scoreNum >= 90) return '🎉';
    if (scoreNum >= 70) return '👍';
    if (scoreNum >= 50) return '💪';
    return '📚';
  };

  const getMessage = () => {
    if (scoreNum >= 90) return '太棒了！继续保持！';
    if (scoreNum >= 70) return '做得不错！';
    if (scoreNum >= 50) return '还需努力！';
    return '继续学习吧！';
  };

  return (
    <View style={styles.container}>
      <View style={styles.resultCard}>
        <Text style={styles.emoji}>{getEmoji()}</Text>
        <Text style={styles.score}>{scoreNum}%</Text>
        <Text style={styles.message}>{getMessage()}</Text>

        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{correctNum}</Text>
            <Text style={styles.statLabel}>正确</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalNum - correctNum}</Text>
            <Text style={styles.statLabel}>错误</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalNum}</Text>
            <Text style={styles.statLabel}>总题数</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/learn')}
        >
          <MaterialIcons name="refresh" size={20} color="#3b82f6" />
          <Text style={styles.actionButtonText}>再做一组</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => router.push('/learn/wrong-answers')}
        >
          <MaterialIcons name="history" size={20} color="#6b7280" />
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>查看错题</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.homeButton]}
          onPress={() => router.push('/(tabs)')}
        >
          <MaterialIcons name="home" size={20} color="#fff" />
          <Text style={[styles.actionButtonText, styles.homeButtonText]}>返回首页</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  score: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  message: {
    fontSize: 18,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    marginTop: 32,
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  actions: {
    marginTop: 32,
    width: '100%',
    maxWidth: 400,
    gap: 12,
  },
  actionButton: {
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
  secondaryButton: {
    borderColor: '#e5e7eb',
  },
  secondaryButtonText: {
    color: '#6b7280',
  },
  homeButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  homeButtonText: {
    color: '#fff',
  },
});