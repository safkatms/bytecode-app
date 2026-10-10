// src/lib/api/attendance.api.ts

import { api } from '@/lib/axios';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type {
    AttendanceRecord,
    AttendanceFilter,
    DailySummaryItem,
    MonthlySummary,
    Employee,
    EmployeeFilter,
    TrustedDevice,
} from '@/types/attendance';



// ── Admin: Attendance ──────────────────────────────────────────────────────────

export async function adminListAttendance(filter: AttendanceFilter = {}): Promise<PaginatedResponse<AttendanceRecord>> {
    const res = await api.get<PaginatedResponse<AttendanceRecord>>('/admin/attendance', { params: filter });
    return res.data;
}

export async function adminGetAttendance(id: number): Promise<AttendanceRecord> {
    const res = await api.get<ApiResponse<AttendanceRecord>>(`/admin/attendance/${id}`);
    return res.data.data!;
}

export async function adminMarkAttendance(payload: {
    employeeId: number;
    attendanceDate: string;
    status: string;
    checkInTime?: string;
    checkOutTime?: string;
    lateMinutes?: number;
    note?: string;
}): Promise<AttendanceRecord> {
    const res = await api.post<ApiResponse<AttendanceRecord>>('/admin/attendance', payload);
    return res.data.data!;
}

export async function adminUpdateAttendance(id: number, payload: Partial<{
    attendanceDate: string;
    status: string;
    checkInTime: string;
    checkOutTime: string;
    lateMinutes: number;
    note: string;
}>): Promise<AttendanceRecord> {
    const res = await api.patch<ApiResponse<AttendanceRecord>>(`/admin/attendance/${id}`, payload);
    return res.data.data!;
}

export async function adminDeleteAttendance(id: number): Promise<void> {
    await api.delete(`/admin/attendance/${id}`);
}

export async function adminGetDailySummary(date: string): Promise<DailySummaryItem[]> {
    const res = await api.get<ApiResponse<DailySummaryItem[]>>(`/admin/attendance/summary/daily?date=${date}`);
    return res.data.data!;
}

export async function adminGetMonthlySummary(month: string, employeeId?: number): Promise<MonthlySummary | MonthlySummary[]> {
    const res = await api.get<ApiResponse<MonthlySummary | MonthlySummary[]>>(
        `/admin/attendance/summary/monthly`,
        { params: { month, employeeId } }
    );
    return res.data.data!;
}

export async function adminGetWeeklyTimesheet(employeeId: number, date?: string): Promise<import('@/types/attendance').WeeklyTimesheet> {
    const res = await api.get<import('@/types/api').ApiResponse<import('@/types/attendance').WeeklyTimesheet>>(
        `/admin/attendance/timesheet/weekly/${employeeId}`,
        { params: date ? { date } : undefined },
    );
    return res.data.data!;
}

// ── Admin: Employees ───────────────────────────────────────────────────────────

export async function adminListEmployees(filter: EmployeeFilter = {}): Promise<PaginatedResponse<Employee>> {
    const res = await api.get<PaginatedResponse<Employee>>('/employees', { params: filter });
    return res.data;
}

export async function adminGetEmployee(id: number): Promise<Employee> {
    const res = await api.get<ApiResponse<Employee>>(`/employees/${id}`);
    return res.data.data!;
}

export async function adminCreateEmployee(payload: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    employeeCode: string;
    departmentId?: number;
    designation?: string;
    joiningDate: string;
}): Promise<{ employee: Employee; temporaryPassword: string }> {
    const res = await api.post<ApiResponse<{ employee: Employee; temporaryPassword: string }>>(
        '/employees',
        payload,
    );
    return res.data.data!;
}

export async function adminUpdateEmployee(id: number, payload: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    employeeCode: string;
    departmentId: number;
    designation: string;
    joiningDate: string;
}>): Promise<Employee> {
    const res = await api.patch<ApiResponse<Employee>>(`/employees/${id}`, payload);
    return res.data.data!;
}

export async function adminToggleEmployee(id: number): Promise<Employee> {
    const res = await api.patch<ApiResponse<Employee>>(`/employees/${id}/toggle-active`, {});
    return res.data.data!;
}

export async function adminDeleteEmployee(id: number): Promise<void> {
    await api.delete(`/employees/${id}`);
}

export async function adminGetDevices(employeeId: number): Promise<TrustedDevice[]> {
    const res = await api.get<ApiResponse<TrustedDevice[]>>(`/employees/${employeeId}/devices`);
    return res.data.data!;
}

export async function adminRevokeDevice(deviceId: number): Promise<void> {
    await api.delete(`/employees/devices/${deviceId}`);
}

export async function adminUnrevokeDevice(deviceId: number): Promise<void> {
    await api.patch(`/employees/devices/${deviceId}/unrevoke`);
}
