import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Professional approach: session is stored in an HttpOnly cookie set by the API.
  // We must include credentials so the browser sends cookies on XHR/fetch.
  req = req.clone({ withCredentials: true });
  return next(req);
};
