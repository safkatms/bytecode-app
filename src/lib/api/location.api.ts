import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { OfficeLocation } from '@/types/attendance';

export async function getOfficeLocation(): Promise<OfficeLocation | null> {
    const res = await api.get<ApiResponse<OfficeLocation | null>>('/attendance/office-location');
    return res.data.data ?? null;
}

export async function adminSaveOfficeLocation(payload: {
    name: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
}): Promise<OfficeLocation> {
    const res = await api.put<ApiResponse<OfficeLocation>>('/attendance/office-location', payload);
    return res.data.data!;
}
