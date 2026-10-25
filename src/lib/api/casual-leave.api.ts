// src/lib/api/casual-leave.api.ts

import { api } from '@/lib/axios';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type {
    CasualLeaveBalance, CasualLeaveFilter, CasualLeavePolicy, CasualLeaveRequest,
} from '@/types/casual-leave';

// ─── Employee ─────────────────────────────────────────────────

export async function applyCasualLeave(payload: {
    startDate: string;
    endDate: string;
    reason?: string;
}): Promise<CasualLeaveRequest> {
    const res = await api.post<ApiResponse<CasualLeaveRequest>>('/casual-leave/apply', payload);
    return res.data.data!;
}

export async function cancelCasualLeave(id: number): Promise<CasualLeaveRequest> {
    const res = await api.patch<ApiResponse<CasualLeaveRequest>>(`/casual-leave/${id}/cancel`);
    return res.data.data!;
}

export async function getMyCasualLeaveRequests(filter: CasualLeaveFilter = {}): Promise<PaginatedResponse<CasualLeaveRequest>> {
    const res = await api.get<PaginatedResponse<CasualLeaveRequest>>('/casual-leave/my-requests', { params: filter });
    return res.data;
}

export async function getMyCasualLeaveBalance(year?: number): Promise<CasualLeaveBalance> {
    const res = await api.get<ApiResponse<CasualLeaveBalance>>('/casual-leave/my-balance', { params: { year } });
    return res.data.data!;
}

// ─── Admin ────────────────────────────────────────────────────

export async function adminSetCasualLeavePolicy(payload: {
    year: number;
    totalDays: number;
    maxCarryForward: number;
}): Promise<CasualLeavePolicy> {
    const res = await api.post<ApiResponse<CasualLeavePolicy>>('/admin/casual-leave/policy', payload);
    return res.data.data!;
}

export async function adminGetCasualLeavePolicy(year: number): Promise<CasualLeavePolicy> {
    const res = await api.get<ApiResponse<CasualLeavePolicy>>(`/admin/casual-leave/policy/${year}`);
    return res.data.data!;
}

export async function adminListCasualLeaveRequests(filter: CasualLeaveFilter = {}): Promise<PaginatedResponse<CasualLeaveRequest>> {
    const res = await api.get<PaginatedResponse<CasualLeaveRequest>>('/admin/casual-leave/requests', { params: filter });
    return res.data;
}

export async function adminGetCasualLeaveRequest(id: number): Promise<CasualLeaveRequest> {
    const res = await api.get<ApiResponse<CasualLeaveRequest>>(`/admin/casual-leave/requests/${id}`);
    return res.data.data!;
}

export async function adminReviewCasualLeave(id: number, payload: {
    action: 'approved' | 'rejected';
    reviewNote?: string;
}): Promise<CasualLeaveRequest> {
    const res = await api.patch<ApiResponse<CasualLeaveRequest>>(`/admin/casual-leave/requests/${id}/review`, payload);
    return res.data.data!;
}

export async function adminMarkCasualLeave(payload: {
    employeeId: number;
    date: string;
    note?: string;
}): Promise<CasualLeaveRequest> {
    const res = await api.post<ApiResponse<CasualLeaveRequest>>('/admin/casual-leave/mark', payload);
    return res.data.data!;
}
