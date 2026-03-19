import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStorageService } from '../services/token-storage.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(TokenStorageService);

  const isApiRequest = req.url.startsWith('/api/');
  const isLoginRequest = req.url.endsWith('/auth/login');

  if (!isApiRequest || isLoginRequest) {
    return next(req);
  }

  const session = storage.read();

  if (!session?.token) {
    return next(req);
  }

  const authRequest = req.clone({
    setHeaders: {
      Authorization: `Bearer ${session.token}`,
    },
  });

  return next(authRequest);
};
