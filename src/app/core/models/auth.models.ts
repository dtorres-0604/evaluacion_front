export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: number | null;
  userName: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface AuthState {
  token: string | null;
  userId: number | null;
  userName: string | null;
  email: string | null;
  roles: string[];
  permissions: string[];
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}
