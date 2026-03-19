import { Injectable } from '@angular/core';
import { LoginResponse } from '../models/auth.models';

const AUTH_STORAGE_KEY = 'et-auth-session';

@Injectable({
  providedIn: 'root',
})
export class TokenStorageService {
  save(session: LoginResponse): void {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }

  read(): LoginResponse | null {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as LoginResponse;
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  }

  clear(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}
