// src/types/sick-leave.ts

export type SickLeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface SickLeavePolicy {
    id: number;
    year: number;
    totalDays: number;
    isActive: boolean;
}

export interface SickLeaveBalance {
    year: number;
    totalDays: number | null;
    usedDays: number;
    remainingDays: number | null;
}

// Item of GET /admin/sick-leave/balances: a balance plus who it belongs to.
export interface SickLeaveEmployeeBalance extends SickLeaveBalance {
    employee: {
        id: number;
        employeeCode: string;
        designation?: string | null;
        user?: { id: number; firstName: string | null; lastName: string | null; email: string };
    };
}

export interface SickLeaveRequest {
    id: number;
    employeeId: number;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string | null;
    status: SickLeaveStatus;
    reviewedBy: number | null;
    reviewedAt: string | null;
    reviewNote: string | null;
    createdAt: string;
    employee?: {
        id: number;
        employeeCode: string;
        user?: { firstName: string | null; lastName: string | null; email: string };
    };
}

export interface SickLeaveFilter {
    page?: number;
    limit?: number;
    status?: SickLeaveStatus;
    year?: number;
    employeeId?: number;
}
