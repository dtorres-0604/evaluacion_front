import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

const API_BASE_URL = '/api';

export interface UserDto {
  id: number;
  username: string;
  email: string;
  name: string;
  lastName: string;
  phone?: string | null;
  department: string;
  roles: string[];
}

export interface UserCreateDto {
  username: string;
  email: string;
  password: string;
  name: string;
  lastName: string;
  phone?: string;
  department: string;
  roles: string[];
}

export interface RoleOptionDto {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  constructor(private readonly http: HttpClient) {}

  getRoles(): Observable<RoleOptionDto[]> {
    return this.http
      .get<unknown>(`${API_BASE_URL}/entity/rol`)
      .pipe(map((response) => this.mapRolesResponse(response)));
  }

  getUsers(): Observable<UserDto[]> {
    return this.http
      .get<unknown>(`${API_BASE_URL}/entity/usuario`)
      .pipe(map((response) => this.mapUsersResponse(response)));
  }

  createUser(payload: UserCreateDto): Observable<void> {
    return this.http.post<void>(`${API_BASE_URL}/auth/users`, payload);
  }

  updateUser(id: number, payload: Partial<UserCreateDto>): Observable<void> {
    return this.http.put<void>(`${API_BASE_URL}/entity/usuario/${id}`, payload);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/entity/usuario/${id}`);
  }

  private mapUsersResponse(raw: unknown): UserDto[] {
    const source = this.unwrapData(raw);

    if (!Array.isArray(source)) {
      return [];
    }

    return source
      .map((item) => this.mapUser(item))
      .filter((item): item is UserDto => item !== null);
  }

  private mapRolesResponse(raw: unknown): RoleOptionDto[] {
    const source = this.unwrapData(raw);

    if (!Array.isArray(source)) {
      return [];
    }

    return source
      .map((item) => this.mapRole(item))
      .filter((item): item is RoleOptionDto => item !== null);
  }

  private unwrapData(raw: unknown): unknown {
    if (raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)) {
      return (raw as Record<string, unknown>)['data'];
    }

    return raw;
  }

  private mapUser(raw: unknown): UserDto | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const source = raw as Record<string, unknown>;
    const idRaw = source['id'] ?? source['usuarioId'];
    const id = typeof idRaw === 'number' ? idRaw : Number(idRaw);

    if (!Number.isFinite(id)) {
      return null;
    }

    return {
      id,
      username: this.readString(source, ['username', 'userName', 'nombreUsuario']) ?? '',
      email: this.readString(source, ['email']) ?? '',
      name: this.readString(source, ['name', 'nombre']) ?? '',
      lastName: this.readString(source, ['lastName', 'apellido']) ?? '',
      phone: this.readString(source, ['phone', 'telefono']),
      department: this.readString(source, ['department', 'departamento']) ?? '',
      roles: this.readRoleNames(source),
    };
  }

  private mapRole(raw: unknown): RoleOptionDto | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const source = raw as Record<string, unknown>;
    const idRaw = source['id'] ?? source['rolId'];
    const id = typeof idRaw === 'number' ? idRaw : Number(idRaw);
    const name = this.readString(source, ['name', 'nombre']) ?? '';

    if (!Number.isFinite(id) || !name) {
      return null;
    }

    return { id, name };
  }

  private readRoleNames(source: Record<string, unknown>): string[] {
    const rolesRaw = source['roles'];

    if (!Array.isArray(rolesRaw)) {
      return [];
    }

    return rolesRaw
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (item && typeof item === 'object') {
          return this.readString(item as Record<string, unknown>, ['name', 'nombre']) ?? null;
        }

        return null;
      })
      .filter((item): item is string => typeof item === 'string' && item.length > 0);
  }

  private readString(source: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string') {
        return value;
      }
    }

    return null;
  }

  private readStringArray(source: Record<string, unknown>, keys: string[]): string[] {
    for (const key of keys) {
      const value = source[key];
      if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === 'string');
      }
    }

    return [];
  }
}
