class ApiClientMock {
  private baseUrl: string;
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request(endpoint: string, options: any = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const res: any = await (global as any).fetch(url, options);

    if (res.status === 401) {
      const lowerUrl = (url || '').toLowerCase();
      const isLogin = lowerUrl.includes('/auth/login');
      const isLogout = lowerUrl.includes('/auth/logout');
      if (!isLogin && !isLogout) {
        try {
          await require('../../client/src/hooks/authController').authController.logout();
        } catch {}
        try {
          (global as any).window.location.href = '/';
        } catch {}
        const HANDLED_401 = new Error('401 handled');
        (HANDLED_401 as any).handled = true;
        throw HANDLED_401;
      }
    }

    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {}
    }

    if (!res.ok) {
      const message =
        (data && (data.error || data.message)) ||
        text ||
        `Request failed: ${res.status} ${res.statusText}`;
      const err: any = new Error(message);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data ?? text;
  }

  get(endpoint: string, options?: any) {
    return this.request(endpoint, options);
  }
  post(endpoint: string, body?: any, options?: any) {
    return this.request(endpoint, { ...options, body });
  }
  put(endpoint: string, body?: any, options?: any) {
    return this.request(endpoint, { ...options, body });
  }
  patch(endpoint: string, body?: any, options?: any) {
    return this.request(endpoint, { ...options, body });
  }
  delete(endpoint: string, options?: any) {
    return this.request(endpoint, options);
  }
}

export const apiClient = new ApiClientMock('/api');
export default apiClient;
