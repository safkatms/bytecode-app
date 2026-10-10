import { api } from '@/lib/axios';
import * as SecureStore from 'expo-secure-store';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type {
    AttendanceRecord,
    TodayStatus,
    WeeklyTimesheet,
    MonthlySummary,
    MyAttendanceFilter,
} from '@/types/attendance';

const DEVICE_ID_KEY = 'app_device_id';

async function deviceHeaders() {
    const deviceId = (await SecureStore.getItemAsync(DEVICE_ID_KEY)) ?? 'unknown';
    return { 'X-Device-ID': deviceId };
}

export async function checkIn(latitude: number, longitude: number, checkInTime: string): Promise<AttendanceRecord> {
    const headers = await deviceHeaders();
    const res = await api.post<ApiResponse<AttendanceRecord>>(
        '/attendance/me/check-in',
        { latitude, longitude, checkInTime },
        { headers },
    );
    return res.data.data!;
}

export async function checkOut(latitude: number, longitude: number, checkOutTime: string): Promise<AttendanceRecord> {
    const headers = await deviceHeaders();
    const res = await api.post<ApiResponse<AttendanceRecord>>(
        '/attendance/me/check-out',
        { latitude, longitude, checkOutTime },
        { headers },
    );
    return res.data.data!;
}

export async function getTodayStatus(): Promise<TodayStatus> {
    const res = await api.get<ApiResponse<TodayStatus>>('/attendance/me/today');
    return res.data.data!;
}

export async function getMyHistory(filter: MyAttendanceFilter = {}): Promise<PaginatedResponse<AttendanceRecord>> {
    const res = await api.get<PaginatedResponse<AttendanceRecord>>('/attendance/me/history', { params: filter });
    return res.data;
}

export async function getMonthlySummary(month: string): Promise<MonthlySummary> {
    const res = await api.get<ApiResponse<MonthlySummary>>('/attendance/me/summary', { params: { month } });
    return res.data.data!;
}

export async function getWeeklyTimesheet(date?: string): Promise<WeeklyTimesheet> {
    const res = await api.get<ApiResponse<WeeklyTimesheet>>('/attendance/me/timesheet/weekly', {
        params: date ? { date } : undefined,
    });
    return res.data.data!;
}
