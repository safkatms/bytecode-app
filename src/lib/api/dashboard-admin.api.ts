import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';

export interface AdminOverview {
    employees: { total: number; active: number; inactive: number };
    todayAttendance: {
        present: number; late: number; absent: number;
        onLeave: number; halfDay: number; notMarked: number;
    };
    devices: { trusted: number };
}

export interface AttendanceTrendItem {
    month: string;
    present: number;
    late: number;
    absent: number;
}

export interface DepartmentBreakdownItem {
    department: string;
    total: number;
    present: number;
    absent: number;
    late: number;
}

export interface RecentActivityItem {
    id: number;
    employee: string;
    employeeCode: string;
    department: { id: number; name: string } | string | null;
    date: string;
    status: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    isManual: boolean;
}

export interface LateReportItem {
    employee: {
        id: number;
        employeeCode: string;
        department: { id: number; name: string } | string | null;
        user: { firstName: string; lastName: string };
    };
    count: number;
    totalLateMinutes: number;
}

export async function getAdminOverview(): Promise<AdminOverview> {
    const res = await api.get<ApiResponse<AdminOverview>>('/admin/dashboard/overview');
    return res.data.data!;
}

export async function getAdminAttendanceTrend(months = 6): Promise<AttendanceTrendItem[]> {
    const res = await api.get<ApiResponse<AttendanceTrendItem[]>>('/admin/dashboard/attendance-trend', {
        params: { months },
    });
    return res.data.data!;
}

export async function getAdminDepartmentBreakdown(): Promise<DepartmentBreakdownItem[]> {
    const res = await api.get<ApiResponse<DepartmentBreakdownItem[]>>('/admin/dashboard/department-breakdown');
    return res.data.data!;
}

export async function getAdminRecentActivity(limit = 10): Promise<RecentActivityItem[]> {
    const res = await api.get<ApiResponse<RecentActivityItem[]>>('/admin/dashboard/recent-activity', {
        params: { limit },
    });
    return res.data.data!;
}

export async function getAdminLateReport(month?: string): Promise<LateReportItem[]> {
    const res = await api.get<ApiResponse<LateReportItem[]>>('/admin/dashboard/late-report', {
        params: month ? { month } : {},
    });
    return res.data.data!;
}