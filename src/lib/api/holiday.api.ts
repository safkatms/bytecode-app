// src/lib/api/holiday.api.ts

import { api } from '@/lib/axios';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type { CreateHolidayPayload, Holiday, UpdateHolidayPayload } from '@/types/holiday';

export async function listHolidays(year?: number): Promise<PaginatedResponse<Holiday>> {
    const res = await api.get<PaginatedResponse<Holiday>>('/holidays', { params: { year, limit: 100 } });
    return res.data;
}

export async function getHoliday(id: number): Promise<Holiday> {
    const res = await api.get<ApiResponse<Holiday>>(`/holidays/${id}`);
    return res.data.data!;
}

export async function createHoliday(payload: CreateHolidayPayload): Promise<Holiday> {
    const res = await api.post<ApiResponse<Holiday>>('/holidays', payload);
    return res.data.data!;
}

export async function updateHoliday(id: number, payload: UpdateHolidayPayload): Promise<Holiday> {
    const res = await api.patch<ApiResponse<Holiday>>(`/holidays/${id}`, payload);
    return res.data.data!;
}

export async function deleteHoliday(id: number): Promise<void> {
    await api.delete(`/holidays/${id}`);
}
