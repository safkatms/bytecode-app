// src/lib/api/leave-balance.api.ts

import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { SickLeaveBalance } from '@/types/sick-leave';
import type { CasualLeaveBalance } from '@/types/casual-leave';

export async function adminGetSickLeaveBalance(employeeId: number, year?: number): Promise<SickLeaveBalance> {
    const res = await api.get<ApiResponse<SickLeaveBalance>>(`/admin/sick-leave/balance/${employeeId}`, { params: { year } });
    return res.data.data!;
}

export async function adminGetCasualLeaveBalance(employeeId: number, year?: number): Promise<CasualLeaveBalance> {
    const res = await api.get<ApiResponse<CasualLeaveBalance>>(`/admin/casual-leave/balance/${employeeId}`, { params: { year } });
    return res.data.data!;
}
