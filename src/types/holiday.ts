// src/types/holiday.ts

export interface Holiday {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    description?: string | null;
    createdAt: string;
    exclusions?: HolidayExclusion[];
}

export interface HolidayExclusion {
    id: number;
    employee?: { id: number; employeeCode: string; user: { firstName: string; lastName: string } } | null;
    team?: { id: number; name: string } | null;
}

export interface CreateHolidayPayload {
    name: string;
    startDate: string;
    endDate: string;
    description?: string;
    excludeEmployeeIds?: number[];
    excludeTeamIds?: number[];
}

export interface UpdateHolidayPayload {
    name?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    excludeEmployeeIds?: number[];
    excludeTeamIds?: number[];
}
