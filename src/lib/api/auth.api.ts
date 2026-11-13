import { api, setTokens, clearTokens } from '@/lib/axios';
import { useAuthStore } from '@/store/auth.store';
import type { ApiResponse, TokenResponse } from '@/types/api';
import type { User } from '@/types/attendance';
import { queryClient } from '../query-client';
import { unregisterFromPushNotifications } from '../notifications';
export async function login(
    email: string,
    password: string,
    options?: { deviceId?: string; deviceName?: string },
) {
    const res = await api.post<ApiResponse<{ accessToken: string; refreshToken: string; expiresIn: string; user: User }>>(
        '/auth/login',
        { email, password, ...options },
    );
    const { accessToken, refreshToken, user } = res.data.data!;
    await setTokens(accessToken, refreshToken);
    return user;
}

export async function logout() {
    // needs the auth token, so it must run before clearTokens()
    await unregisterFromPushNotifications();
    try { await api.post('/auth/logout'); } finally {
        await clearTokens();
        queryClient.clear();
        useAuthStore.getState().setUser(null);
        useAuthStore.getState().setAdminViewMode('me');
        useAuthStore.getState().setAuthenticated(false);
    }
}

export async function changePassword(currentPassword: string, newPassword: string) {
    await api.post('/auth/change-password', { currentPassword, newPassword });
}

export async function forgotPassword(email: string) {
    await api.post('/auth/forgot-password', { email });
}

export async function resetPassword(token: string, newPassword: string) {
    await api.post('/auth/reset-password', { token, newPassword });
}

export async function switchUser(userId: number): Promise<User> {
    const res = await api.post<ApiResponse<{ accessToken: string; expiresIn: string; impersonatedUser: User }>>(
        '/auth/switch-user',
        { userId },
    );
    const { accessToken, impersonatedUser } = res.data.data!;
    // Replace only the access token — no refresh token issued for impersonation
    await setTokens(accessToken, null);
    return impersonatedUser;
}