// src/lib/api/teams.api.ts

import { api } from '@/lib/axios';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type { Team, TeamFilter } from '@/types/attendance';

export async function adminListTeams(filter: TeamFilter = {}): Promise<PaginatedResponse<Team>> {
    const res = await api.get<PaginatedResponse<Team>>('/teams', { params: filter });
    return res.data;
}

export async function adminGetTeam(id: number): Promise<Team> {
    const res = await api.get<ApiResponse<Team>>(`/teams/${id}`);
    return res.data.data!;
}

export async function adminListActiveTeams(): Promise<Team[]> {
    const res = await api.get<ApiResponse<Team[]>>('/teams/active');
    return res.data.data!;
}

export async function adminCreateTeam(payload: {
    name: string;
    description?: string;
    leaderId: number;
}): Promise<Team> {
    const res = await api.post<ApiResponse<Team>>('/teams', payload);
    return res.data.data!;
}

export async function adminUpdateTeam(id: number, payload: Partial<{
    name: string;
    description: string;
    leaderId: number;
    isActive: boolean;
}>): Promise<Team> {
    const res = await api.patch<ApiResponse<Team>>(`/teams/${id}`, payload);
    return res.data.data!;
}

export async function adminDeleteTeam(id: number): Promise<void> {
    await api.delete(`/teams/${id}`);
}

export async function adminAddTeamMember(teamId: number, employeeId: number): Promise<void> {
    await api.post(`/teams/${teamId}/members`, { employeeId });
}

export async function adminRemoveTeamMember(teamId: number, employeeId: number): Promise<void> {
    await api.delete(`/teams/${teamId}/members/${employeeId}`);
}
