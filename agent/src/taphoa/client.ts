export interface TaphoaConfig {
  baseUrl: string;
  phone: string;
  password: string;
  /** Cho test tiêm fetch giả; production để trống → dùng fetch thật. */
  fetchFn?: typeof fetch;
}

export class TaphoaClient {
  private token: string | null = null;

  constructor(private cfg: TaphoaConfig) {}

  private get f(): typeof fetch {
    return this.cfg.fetchFn ?? fetch;
  }

  async login(): Promise<string> {
    const res = await this.f(`${this.cfg.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: this.cfg.phone, password: this.cfg.password }),
    });
    if (!res.ok) throw new Error(`Login thất bại: ${res.status}`);
    const data = (await res.json()) as { token: string };
    this.token = data.token;
    return data.token;
  }

  async get<T = unknown>(path: string, params?: Record<string, string | number>): Promise<T> {
    if (!this.token) await this.login();

    const doFetch = () => {
      const url = new URL(`${this.cfg.baseUrl}/api${path}`);
      if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
      return this.f(url, { headers: { Authorization: `Bearer ${this.token}` } });
    };

    let res = await doFetch();
    if (res.status === 401) {
      await this.login(); // token hết hạn → login lại 1 lần
      res = await doFetch();
    }
    if (!res.ok) throw new Error(`GET ${path} thất bại: ${res.status}`);
    return (await res.json()) as T;
  }
}

/** Instance dùng chung, dựng từ biến môi trường. */
export const taphoa = new TaphoaClient({
  baseUrl: process.env.TAPHOA_API_URL ?? "http://localhost:8082",
  phone: process.env.TAPHOA_PHONE ?? "",
  password: process.env.TAPHOA_PASSWORD ?? "",
});
