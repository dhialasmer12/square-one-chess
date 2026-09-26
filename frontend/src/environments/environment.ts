export const environment = {
  production: false,
  /**
   * Empty = same origin as the Angular app. `ng serve` proxies `/api` and
   * `/socket.io` to the Express API so the HttpOnly session cookie is first-party
   * (works for both localhost and 127.0.0.1).
   */
  API_URL: '',
  WS_URL: '',
};
