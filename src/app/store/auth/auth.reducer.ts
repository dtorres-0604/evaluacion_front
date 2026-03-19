import { createFeature, createReducer, on } from '@ngrx/store';
import { AuthState } from '../../core/models/auth.models';
import { AuthActions } from './auth.actions';

const initialState: AuthState = {
  token: null,
  userId: null,
  userName: null,
  email: null,
  roles: [],
  permissions: [],
  isAuthenticated: false,
  loading: false,
  error: null,
};

export const authFeature = createFeature({
  name: 'auth',
  reducer: createReducer(
    initialState,
    on(AuthActions.login, (state) => ({
      ...state,
      loading: true,
      error: null,
    })),
    on(AuthActions.loginSuccess, (state, { session }) => ({
      ...state,
      token: session.token,
      userId: session.userId,
      userName: session.userName,
      email: session.email,
      roles: session.roles,
      permissions: session.permissions,
      isAuthenticated: true,
      loading: false,
      error: null,
    })),
    on(AuthActions.restoreSession, (state, { session }) => ({
      ...state,
      token: session.token,
      userId: session.userId,
      userName: session.userName,
      email: session.email,
      roles: session.roles,
      permissions: session.permissions,
      isAuthenticated: true,
      loading: false,
      error: null,
    })),
    on(AuthActions.loginFailure, (state, { error }) => ({
      ...state,
      loading: false,
      error,
      isAuthenticated: false,
    })),
    on(AuthActions.logout, () => initialState),
  ),
});
