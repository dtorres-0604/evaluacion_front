import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { LoginRequest, LoginResponse } from '../../core/models/auth.models';

export const AuthActions = createActionGroup({
  source: 'Auth',
  events: {
    Login: props<{ request: LoginRequest }>(),
    'Login Success': props<{ session: LoginResponse }>(),
    'Login Failure': props<{ error: string }>(),
    'Restore Session': props<{ session: LoginResponse }>(),
    Logout: emptyProps(),
  },
});
