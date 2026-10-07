// src/types/attendance.ts

export type AttendanceStatus =
    | 'present' | 'absent' | 'late' | 'half_day'
    | 'on_leave' | 'holiday' | 'weekend';

export type RecordStatus = 'active' | 'deleted';

export interface AttendanceRecord {
    id: number;
    employeeId: number;
    attendanceDate: string;
    status: AttendanceStatus;
    checkInTime: string | null;
    checkOutTime: string | null;
    workHours: string | null;
    lateMinutes: number;
    checkInLat: string | null;
    checkInLng: string | null;
    checkOutLat: string | null;
    checkOutLng: string | null;
    deviceId: string | null;
    isManual: boolean;
    note: string | null;
    createdAt: string;
    employee?: {
        id: number;
        employeeCode: string;
        department: string | null;
        designation: string | null;
        user: { firstName: string | null; lastName: string | null; email: string };
    };
}

export interface DailySummaryItem {
    status: AttendanceStatus;
    _count: { id: number };
}

export interface MonthlySummary {
    month: string;
    summary: {
        present: number;
        absent: number;
        late: number;
        half_day: number;
        on_leave: number;
        holiday: number;
        weekend: number;
        totalWorkHours: number;
        totalLateMinutes: number;
    };
    records: AttendanceRecord[];
}

export interface Employee {
    id: number;
    userId: number;
    employeeCode: string;
    department: string | null;
    designation: string | null;
    joiningDate: string;
    isActive: boolean;
    createdAt: string;
    user: {
        id: number;
        firstName: string | null;
        lastName: string | null;
        email: string;
        phone: string | null;
    };
}

export interface TrustedDevice {
    id: number;
    employeeId: number;
    deviceId: string;
    deviceName: string | null;
    isActive: boolean;
    firstSeenAt: string;
    lastSeenAt: string;
    revokedAt: string | null;
}

export interface OfficeLocation {
    id: number;
    name: string;
    latitude: string;
    longitude: string;
    radiusMeters: number;
    isActive: boolean;
    createdAt: string;
}

export interface AttendanceFilter {
    page?: number;
    limit?: number;
    employeeId?: number;
    fromDate?: string;
    toDate?: string;
    status?: AttendanceStatus;
    department?: string;
}

export interface EmployeeFilter {
    page?: number;
    limit?: number;
    department?: string;
    search?: string;
}