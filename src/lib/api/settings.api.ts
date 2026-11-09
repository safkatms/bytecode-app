import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';

export interface SystemSettings {
  /** 24h "HH:mm" */
  officeReminderTime: string;
}

export const DEFAULT_SETTINGS: SystemSettings = { officeReminderTime: '10:00' };

export async function getSettings(): Promise<SystemSettings> {
  const res = await api.get<ApiResponse<SystemSettings>>('/settings');
  return res.data.data ?? DEFAULT_SETTINGS;
}

export async function adminUpdateSettings(payload: Partial<SystemSettings>): Promise<SystemSettings> {
  const res = await api.put<ApiResponse<SystemSettings>>('/settings', payload);
  return res.data.data!;
}
