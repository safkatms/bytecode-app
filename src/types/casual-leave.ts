// src/types/casual-leave.ts

export type CasualLeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface CasualLeavePolicy {
    id: number;
    year: number;
    totalDays: number;
    maxCarryForward: number;
    isActive: boolean;
}

export interface CasualLeaveBalance {
    year: number;
    allocatedDays: number | null;
    carryForwardDays: number;
    totalDays: number | null;
    usedDays: number;
    remainingDays: number | null;
}

export interface CasualLeaveRequest {
    id: number;
    employeeId: number;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string | null;
    status: CasualLeaveStatus;
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

export interface CasualLeaveFilter {
    page?: number;
    limit?: number;
    status?: CasualLeaveStatus;
    year?: number;
    employeeId?: number;
}
