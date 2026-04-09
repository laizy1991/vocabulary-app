import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/services/api';
import { MaterialIcons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      '确认退出',
      '确定要退出登录吗？',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '退出', 
          style: 'destructive',
          onPress: async () => {
            try {
              await authApi.logout();
            } catch (e) {}
            logout();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  const handleUpdateNickname = async () => {
    if (!nickname.trim()) {
      Alert.alert('提示', '昵称不能为空');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.updateProfile({ nickname: nickname.trim() });
      if (response.data.success) {
        updateUser({ nickname: nickname.trim() });
        setEditing(false);
        Alert.alert('成功', '昵称已更新');
      }
    } catch (error: any) {
      Alert.alert('失败', error.response?.data?.error || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <MaterialIcons name="person" size={48} color="#fff" />
        </View>
        {editing ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.nicknameInput}
              value={nickname}
              onChangeText={setNickname}
              autoFocus
            />
            <TouchableOpacity onPress={handleUpdateNickname} disabled={loading}>
              <MaterialIcons name="check" size={24} color="#10b981" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setEditing(false); setNickname(user?.nickname || ''); }}>
              <MaterialIcons name="close" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.nicknameRow} onPress={() => setEditing(true)}>
            <Text style={styles.nickname}>{user?.nickname || '用户'}</Text>
            <MaterialIcons name="edit" size={18} color="#6b7280" />
          </TouchableOpacity>
        )}
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>账号设置</Text>
        
        <TouchableOpacity style={styles.menuItem}>
          <MaterialIcons name="lock" size={24} color="#6b7280" />
          <Text style={styles.menuText}>修改密码</Text>
          <MaterialIcons name="chevron-right" size={24} color="#d1d5db" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <MaterialIcons name="notifications" size={24} color="#6b7280" />
          <Text style={styles.menuText">通知设置</Text>
          <MaterialIcons name="chevron-right" size={24} color="#d1d5db" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <MaterialIcons name="cloud-upload" size={24} color="#6b7280" />
          <Text style={styles.menuText}>数据同步</Text>
          <MaterialIcons name="chevron-right" size={24} color="#d1d5db" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>其他</Text>
        
        <TouchableOpacity style={styles.menuItem}>
          <MaterialIcons name="info" size={24} color="#6b7280" />
          <Text style={styles.menuText}>关于</Text>
          <MaterialIcons name="chevron-right" size={24} color="#d1d5db" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <MaterialIcons name="help" size={24} color="#6b7280" />
          <Text style={styles.menuText}>帮助与反馈</Text>
          <MaterialIcons name="chevron-right" size={24} color="#d1d5db" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <MaterialIcons name="logout" size={24} color="#ef4444" />
        <Text style={styles.logoutText}>退出登录</Text>
      </TouchableOpacity>

      <Text style={styles.version}>版本 1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nicknameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  nickname: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  nicknameInput: {
    fontSize: 18,
    padding: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
    minWidth: 150,
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
  },
  menuItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  logoutButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutText: {
    fontSize: 16,
    color: '#ef4444',
    marginLeft: 8,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: '#d1d5db',
    fontSize: 12,
    marginTop: 32,
  },
});