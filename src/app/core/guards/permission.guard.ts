import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs';
import { selectPermissions } from '../../store/auth/auth.selectors';
import { hasPermission } from '../auth/permission.utils';

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const requiredPermission = route.data['permission'] as string | undefined;

  if (!requiredPermission) {
    return true;
  }

  const store = inject(Store);
  const router = inject(Router);

  return store.select(selectPermissions).pipe(
    take(1),
    map((permissions) => {
      if (hasPermission(requiredPermission, permissions)) {
        return true;
      }

      return router.createUrlTree(['/main/home'], {
        queryParams: { denied: '1' },
      });
    }),
  );
};
