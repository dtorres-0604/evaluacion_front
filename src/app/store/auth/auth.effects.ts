import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, ROOT_EFFECTS_INIT, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { AuthApiService } from '../../core/services/auth-api.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { AuthActions } from './auth.actions';

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly authApi = inject(AuthApiService);
  private readonly storage = inject(TokenStorageService);
  private readonly router = inject(Router);

  readonly login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      switchMap(({ request }) =>
        this.authApi.login(request).pipe(
          map((session) => AuthActions.loginSuccess({ session })),
          catchError((error: { error?: { message?: string } }) =>
            of(
              AuthActions.loginFailure({
                error: error.error?.message ?? 'No fue posible iniciar sesion.',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  readonly loginSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.loginSuccess),
        tap(({ session }) => {
          this.storage.save(session);
          void this.router.navigate(['/main/home']);
        }),
      ),
    { dispatch: false },
  );

  readonly restoreSessionOnInit$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      map(() => {
        const stored = this.storage.read();
        return stored ? AuthActions.restoreSession({ session: stored }) : AuthActions.logout();
      }),
    ),
  );

  readonly logout$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logout),
        tap(() => {
          this.storage.clear();
          void this.router.navigate(['/login']);
        }),
      ),
    { dispatch: false },
  );
}
