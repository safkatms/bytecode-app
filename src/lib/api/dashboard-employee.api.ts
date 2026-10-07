import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';

export interface EmployeeOverview {
    today: {
        checkedIn: boolean;
        checkedOut: boolean;
        checkInTime: string | null;
        checkOutTime: string | null;
        status: string | null;
        workHours: number | null;
    };
    thisMonth: {
        present: number;
        late: number;
        absent: number;
        onLeave: number;
        totalLateMinutes: number;
    };
    devices: Array<{
        id: number;
        deviceName: string | null;
        deviceId: string;
        lastSeenAt: string | null;
    }>;
}

export interface EmployeeTrendItem {
    month: string;
    present: number;
    late: number;
    absent: number;
    workHours: number;
}

export async function getEmployeeOverview(): Promise<EmployeeOverview> {
    const res = await api.get<ApiResponse<EmployeeOverview>>('/dashboard/me/overview');
    return res.data.data!;
}

export async function getEmployeeAttendanceTrend(months = 6): Promise<EmployeeTrendItem[]> {
    const res = await api.get<ApiResponse<EmployeeTrendItem[]>>('/dashboard/me/attendance-trend', {
        params: { months },
    });
    return res.data.data!;
}