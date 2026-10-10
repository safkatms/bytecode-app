// src/types/attendance.ts

export type AttendanceStatus =
    | 'present' | 'absent' | 'late' | 'half_day'
    | 'on_leave' | 'holiday' | 'weekend';
export type Role = 'admin' | 'user';
export type RecordStatus = 'active' | 'deleted';
export interface PaginationMeta {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
}

export interface PaginatedData<T> {
    data: T[];
    meta: PaginationMeta;
    summary?: {
        income: number;
        expense: number;
        savings: number;
    };
}
export interface User {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    role: Role;
    isActive: boolean;
    mustChangePassword: boolean;
    timezone: string;
    locale: string;
    currency: string;
    dateFormat: string;
    createdAt: string;
}
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
    departmentId: number | null;
    department: { id: number; name: string } | null;
    designation: string | null;
    joiningDate: string;
    isActive: boolean;
    createdAt: string;
    weekendDays: number[] | null;
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

export interface Department {
    id: number;
    name: string;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    createdById: number | null;
}

export interface DepartmentFilter {
    page?: number;
    limit?: number;
    search?: string;
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
    departmentId?: number;
}

export interface TeamMember {
    id: number;
    employeeCode: string;
    user: {
        id: number;
        firstName: string | null;
        lastName: string | null;
        email: string;
    };
}

export interface Team {
    id: number;
    name: string;
    description: string | null;
    isActive: boolean;
    leaderId: number;
    leader: TeamMember;
    members: TeamMember[];
    createdAt: string;
}

export interface TeamFilter {
    page?: number;
    limit?: number;
    search?: string;
}

export interface TodayStatus {
    date: string;
    status: AttendanceStatus | null;
    checkInTime: string | null;
    checkOutTime: string | null;
    workHours: number | null;
    lateMinutes: number;
    checkedIn: boolean;
    checkedOut: boolean;
    isManual: boolean;
}

export interface WeeklyTimesheetDay {
    id?: number;
    date: string;
    day: string;
    status: AttendanceStatus | null;
    checkInTime: string | null;
    checkOutTime: string | null;
    workHours: number | null;
    lateMinutes: number;
    isManual: boolean;
    isWeekend: boolean;
}

export interface WeeklyTimesheet {
    weekStart: string;
    weekEnd: string;
    weekendDays: number[];
    days: WeeklyTimesheetDay[];
    totalWorkHours: number;
    presentDays: number;
    lateDays: number;
}

export interface MyAttendanceFilter {
    page?: number;
    limit?: number;
    fromDate?: string;
    toDate?: string;
    status?: AttendanceStatus;
}