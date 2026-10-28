import { api } from '@/lib/axios';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type { SickLeaveBalance, SickLeaveEmployeeBalance } from '@/types/sick-leave';
import type { CasualLeaveBalance, CasualLeaveEmployeeBalance } from '@/types/casual-leave';

export async function adminGetSickLeaveBalance(employeeId: number, year?: number): Promise<SickLeaveBalance> {
    const res = await api.get<ApiResponse<SickLeaveBalance>>(`/admin/sick-leave/balance/${employeeId}`, { params: { year } });
    return res.data.data!;
}

export async function adminListSickLeaveBalances(params: {
    year?: number;
    page?: number;
    limit?: number;
    search?: string;
} = {}): Promise<PaginatedResponse<SickLeaveEmployeeBalance>> {
    const res = await api.get<PaginatedResponse<SickLeaveEmployeeBalance>>('/admin/sick-leave/balances', { params });
    return res.data;
}

export async function adminAdjustSickLeaveBalance(employeeId: number, payload: {
    year: number;
    usedDays: number;
}): Promise<SickLeaveBalance> {
    const res = await api.patch<ApiResponse<SickLeaveBalance>>(`/admin/sick-leave/balance/${employeeId}`, payload);
    return res.data.data!;
}

export async function adminGetCasualLeaveBalance(employeeId: number, year?: number): Promise<CasualLeaveBalance> {
    const res = await api.get<ApiResponse<CasualLeaveBalance>>(`/admin/casual-leave/balance/${employeeId}`, { params: { year } });
    return res.data.data!;
}

export async function adminListCasualLeaveBalances(params: {
    year?: number;
    page?: number;
    limit?: number;
    search?: string;
} = {}): Promise<PaginatedResponse<CasualLeaveEmployeeBalance>> {
    const res = await api.get<PaginatedResponse<CasualLeaveEmployeeBalance>>('/admin/casual-leave/balances', { params });
    return res.data;
}

export async function adminAdjustCasualLeaveBalance(employeeId: number, payload: {
    year: number;
    usedDays?: number;
    carryForwardDays?: number;
}): Promise<CasualLeaveBalance> {
    const res = await api.patch<ApiResponse<CasualLeaveBalance>>(`/admin/casual-leave/balance/${employeeId}`, payload);
    return res.data.data!;
}
