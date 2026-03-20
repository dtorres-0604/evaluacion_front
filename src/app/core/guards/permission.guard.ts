import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs';
import { selectAuthState } from '../../store/auth/auth.selectors';
import { hasPermission } from '../auth/permission.utils';

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const requiredPermission = route.data['permission'] as string | undefined;
  const allowedRoles = (route.data['allowedRoles'] as string[] | undefined)?.map((role) =>
    role.toLowerCase(),
  );

  if (!requiredPermission && !allowedRoles?.length) {
    return true;
  }

  const store = inject(Store);
  const router = inject(Router);

  return store.select(selectAuthState).pipe(
    take(1),
    map((authState) => {
      const permissions = authState.permissions ?? [];
      const roles = (authState.roles ?? []).map((role) => role.toLowerCase());

      const permissionOk = requiredPermission
        ? hasPermission(requiredPermission, permissions)
        : true;
      const roleOk =
        !allowedRoles?.length || allowedRoles.some((allowedRole) => roles.includes(allowedRole));

      if (permissionOk && roleOk) {
        return true;
      }

      return router.createUrlTree(['/main/home'], {
        queryParams: { denied: '1' },
      });
    }),
  );
};
