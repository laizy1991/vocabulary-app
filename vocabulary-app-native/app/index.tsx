import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const { isLoggedIn } = useAuthStore();
  
  // 根据登录状态跳转
  if (isLoggedIn) {
    return <Redirect href="/(tabs)" />;
  }
  
  return <Redirect href="/(auth)" />;
}