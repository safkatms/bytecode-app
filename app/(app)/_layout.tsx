import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { BottomNav } from '@/components/layout/BottomNav';
import { ensureNotificationPermissions, attachNotificationResponseHandler } from '@/lib/notifications';
import { registerOfficeGeofence, unregisterOfficeGeofence } from '@/lib/office-checkin-reminder';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    ensureNotificationPermissions();
    registerOfficeGeofence();
    const sub = attachNotificationResponseHandler();

    return () => {
      sub.remove();
      unregisterOfficeGeofence();
    };
  }, [isAuthenticated]);

  if (!isLoading && !isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1 },
});
