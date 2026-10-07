// src/lib/api/department.api.ts

import { api } from '@/lib/axios';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type { Department, DepartmentFilter } from '@/types/attendance';

export async function adminListDepartments(filter: DepartmentFilter = {}): Promise<PaginatedResponse<Department>> {
    const res = await api.get<PaginatedResponse<Department>>('/departments', { params: filter });
    return res.data;
}

export async function adminGetDepartment(id: number): Promise<Department> {
    const res = await api.get<ApiResponse<Department>>(`/departments/${id}`);
    return res.data.data!;
}

export async function adminListActiveDepartments(): Promise<Department[]> {
    const res = await api.get<ApiResponse<Department[]>>('/departments/active');
    return res.data.data!;
}

export async function adminCreateDepartment(payload: {
    name: string;
    description?: string;
}): Promise<Department> {
    const res = await api.post<ApiResponse<Department>>('/departments', payload);
    return res.data.data!;
}

export async function adminUpdateDepartment(id: number, payload: Partial<{
    name: string;
    description: string;
    isActive: boolean;
}>): Promise<Department> {
    const res = await api.patch<ApiResponse<Department>>(`/departments/${id}`, payload);
    return res.data.data!;
}

export async function adminDeleteDepartment(id: number): Promise<void> {
    await api.delete(`/departments/${id}`);
}
