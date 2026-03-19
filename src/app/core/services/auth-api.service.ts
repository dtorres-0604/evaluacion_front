import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { LoginRequest, LoginResponse } from '../models/auth.models';
import { sanitizePermissions } from '../auth/permission.utils';

const API_BASE_URL = '/api';

interface JwtPayload {
  nameid?: string;
  sub?: string;
  unique_name?: string;
  name?: string;
  email?: string;
  role?: string | string[];
  permission?: string | string[];
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'?: string;
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'?: string;
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?: string | string[];
}

@Injectable({
  providedIn: 'root',
})
export class AuthApiService {
  constructor(private readonly http: HttpClient) {}

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<Record<string, unknown>>(`${API_BASE_URL}/auth/login`, request)
      .pipe(map((response) => this.mapLoginResponse(response, request)));
  }

  private mapLoginResponse(raw: Record<string, unknown>, request: LoginRequest): LoginResponse {
    const payload = this.unwrapPayload(raw);

    const token =
      this.getString(payload, 'token') ??
      this.getString(payload, 'accessToken') ??
      this.getString(payload, 'jwtToken') ??
      '';

    const decoded = this.decodeJwt(token);

    const userIdFromResponse = this.getNumber(payload, 'userId');
    const userIdClaim =
      decoded.nameid ??
      decoded.sub ??
      decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
    const userIdFromToken = userIdClaim ? Number(userIdClaim) : null;

    return {
      token,
      userId:
        userIdFromResponse ??
        (userIdFromToken !== null && !Number.isNaN(userIdFromToken) ? userIdFromToken : null),
      userName:
        this.getString(payload, 'userName') ??
        this.getString(payload, 'nombreUsuario') ??
        decoded.unique_name ??
        decoded.name ??
        decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ??
        request.email,
      email: this.getString(payload, 'email') ?? decoded.email ?? request.email,
      roles: this.readStringArray(payload, ['roles', 'role']).length
        ? this.readStringArray(payload, ['roles', 'role'])
        : this.normalizeClaimArray(
            decoded.role ?? decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
          ),
      permissions: sanitizePermissions(
        this.readStringArray(payload, ['permissions', 'permisos']).length
          ? this.readStringArray(payload, ['permissions', 'permisos'])
          : this.normalizeClaimArray(decoded.permission),
      ),
    };
  }

  private unwrapPayload(raw: Record<string, unknown>): Record<string, unknown> {
    const candidate = raw['data'];
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      return candidate as Record<string, unknown>;
    }

    return raw;
  }

  private decodeJwt(token: string): JwtPayload {
    if (!token || !token.includes('.')) {
      return {};
    }

    try {
      const payloadPart = token.split('.')[1];
      const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      const decoded = atob(padded);
      return JSON.parse(decoded) as JwtPayload;
    } catch {
      return {};
    }
  }

  private normalizeClaimArray(value: string | string[] | undefined): string[] {
    if (!value) {
      return [];
    }

    return Array.isArray(value) ? value : [value];
  }

  private readStringArray(raw: Record<string, unknown>, keys: string[]): string[] {
    for (const key of keys) {
      const value = raw[key];

      if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === 'string');
      }
    }

    return [];
  }

  private getString(raw: Record<string, unknown>, key: string): string | null {
    const value = raw[key];
    return typeof value === 'string' ? value : null;
  }

  private getNumber(raw: Record<string, unknown>, key: string): number | null {
    const value = raw[key];
    return typeof value === 'number' ? value : null;
  }
}
