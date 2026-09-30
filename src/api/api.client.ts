import {
  documentListSchema,
  documentSchema,
  invoiceSchema,
  loginSchema,
} from './api.schemas.js';
import type { Document } from './api.schemas.js';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly uncertain = false,
  ) {
    super(
      uncertain
        ? 'No se pudo confirmar el resultado HTTP; consultar el documento antes de reintentar.'
        : `La API respondió HTTP ${status}.`,
    );
  }
}

interface ApiOptions {
  baseUrl: string;
  email: string;
  password: string;
  timeoutMs: number;
}

export class ApiClient {
  private token = '';
  private expiresAt = 0;
  private loginInProgress?: Promise<void>;
  private readonly baseUrl: string;

  constructor(
    private readonly options: ApiOptions,
    private readonly signal?: AbortSignal,
  ) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
  }

  private async send(
    path: string,
    method = 'GET',
    body?: unknown,
    authenticated = true,
  ) {
    let response: Response;
    try {
      const timeout = AbortSignal.timeout(this.options.timeoutMs);
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(authenticated ? { Authorization: `Bearer ${this.token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: this.signal ? AbortSignal.any([timeout, this.signal]) : timeout,
        redirect: 'error',
      });
    } catch {
      throw new ApiError(0, true);
    }
    if (!response.ok)
      throw new ApiError(
        response.status,
        method === 'POST' && response.status >= 500,
      );
    try {
      return (await response.json()) as unknown;
    } catch {
      throw new ApiError(response.status, method === 'POST');
    }
  }

  private async authenticate() {
    if (this.token && Date.now() < this.expiresAt) return;
    if (!this.loginInProgress) {
      this.loginInProgress = (async () => {
        const data = loginSchema.parse(
          await this.send(
            '/auth/login',
            'POST',
            {
              email: this.options.email,
              password: this.options.password,
            },
            false,
          ),
        );
        this.token = data.accessToken;
        this.expiresAt = Date.now() + data.expiresIn * 1000 - 5000;
      })();
    }
    try {
      await this.loginInProgress;
    } finally {
      this.loginInProgress = undefined;
    }
  }

  private async request(path: string, method = 'GET', body?: unknown) {
    await this.authenticate();
    try {
      return await this.send(path, method, body);
    } catch (error) {
      // Un 401 rechaza la operación antes de llegar al controlador.
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      this.token = '';
      await this.authenticate();
      return this.send(path, method, body);
    }
  }

  async listDocuments(maxPages: number): Promise<Document[]> {
    const documents = new Map<number, Document>();
    for (let page = 1; page <= maxPages; page++) {
      const data = documentListSchema.parse(
        await this.request(`/documents?page=${page}&limit=100`),
      );
      if (data.pagination.page !== page)
        throw new Error('La API devolvió una página inesperada.');
      for (const document of data.documents)
        documents.set(document.id, document);
      if (page >= data.pagination.totalPages) return [...documents.values()];
    }
    throw new Error(
      'Se alcanzó MAX_DOCUMENT_PAGES sin completar el listado; no se emitirán facturas.',
    );
  }

  async getDocument(id: number) {
    return documentSchema.parse(await this.request(`/documents/${id}`));
  }

  async createInvoice(documentId: number) {
    // Numeración técnica y determinista para la demo; no es numeración fiscal.
    return invoiceSchema.parse(
      await this.request('/invoices', 'POST', {
        number: `DEMO-OV-${documentId}`,
        documentId,
      }),
    );
  }
}
