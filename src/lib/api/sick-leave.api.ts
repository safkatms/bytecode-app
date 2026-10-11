// src/lib/api/sick-leave.api.ts

import { api } from '@/lib/axios';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type {
    SickLeaveBalance, SickLeaveFilter, SickLeavePolicy, SickLeaveRequest,
} from '@/types/sick-leave';

// ─── Employee ─────────────────────────────────────────────────

export async function applySickLeave(payload: {
    startDate: string;
    endDate: string;
    reason?: string;
}): Promise<SickLeaveRequest> {
    const res = await api.post<ApiResponse<SickLeaveRequest>>('/sick-leave/apply', payload);
    return res.data.data!;
}

export async function cancelSickLeave(id: number): Promise<SickLeaveRequest> {
    const res = await api.patch<ApiResponse<SickLeaveRequest>>(`/sick-leave/${id}/cancel`);
    return res.data.data!;
}

export async function getMySickLeaveRequests(filter: SickLeaveFilter = {}): Promise<PaginatedResponse<SickLeaveRequest>> {
    const res = await api.get<PaginatedResponse<SickLeaveRequest>>('/sick-leave/my-requests', { params: filter });
    return res.data;
}

export async function getMySickLeaveBalance(year?: number): Promise<SickLeaveBalance> {
    const res = await api.get<ApiResponse<SickLeaveBalance>>('/sick-leave/my-balance', { params: { year } });
    return res.data.data!;
}

// ─── Admin ────────────────────────────────────────────────────

export async function adminSetSickLeavePolicy(payload: { year: number; totalDays: number }): Promise<SickLeavePolicy> {
    const res = await api.post<ApiResponse<SickLeavePolicy>>('/admin/sick-leave/policy', payload);
    return res.data.data!;
}

export async function adminGetSickLeavePolicy(year: number): Promise<SickLeavePolicy> {
    const res = await api.get<ApiResponse<SickLeavePolicy>>(`/admin/sick-leave/policy/${year}`);
    return res.data.data!;
}

export async function adminListSickLeaveRequests(filter: SickLeaveFilter = {}): Promise<PaginatedResponse<SickLeaveRequest>> {
    const res = await api.get<PaginatedResponse<SickLeaveRequest>>('/admin/sick-leave/requests', { params: filter });
    return res.data;
}

export async function adminGetSickLeaveRequest(id: number): Promise<SickLeaveRequest> {
    const res = await api.get<ApiResponse<SickLeaveRequest>>(`/admin/sick-leave/requests/${id}`);
    return res.data.data!;
}

export async function adminReviewSickLeave(id: number, payload: {
    action: 'approved' | 'rejected';
    reviewNote?: string;
}): Promise<SickLeaveRequest> {
    const res = await api.patch<ApiResponse<SickLeaveRequest>>(`/admin/sick-leave/requests/${id}/review`, payload);
    return res.data.data!;
}

export async function adminMarkSickLeave(payload: {
    employeeId: number;
    date: string;
    note?: string;
}): Promise<SickLeaveRequest> {
    const res = await api.post<ApiResponse<SickLeaveRequest>>('/admin/sick-leave/mark', payload);
    return res.data.data!;
}
