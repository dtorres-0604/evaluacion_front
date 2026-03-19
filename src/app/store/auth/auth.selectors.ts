import { createSelector } from '@ngrx/store';
import { authFeature } from './auth.reducer';
import { hasPermission } from '../../core/auth/permission.utils';

export const selectAuthState = authFeature.selectAuthState;
export const selectAuthLoading = authFeature.selectLoading;
export const selectAuthError = authFeature.selectError;
export const selectIsAuthenticated = authFeature.selectIsAuthenticated;
export const selectPermissions = authFeature.selectPermissions;
export const selectUserName = authFeature.selectUserName;
export const selectUserId = authFeature.selectUserId;

export const selectCanAccessPermission = (permission: string) =>
  createSelector(selectPermissions, (permissions) => hasPermission(permission, permissions));
