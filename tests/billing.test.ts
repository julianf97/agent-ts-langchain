import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { createAgent } from 'langchain';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { ApiClient } from '../src/api/api.client.js';
import { createBillingTools } from '../src/agent/tools/billing.tools.js';
import { billingInstructions } from '../src/agent/billing.agent.js';
import { loadConfig } from '../src/config/env.js';
import { createRunLog, saveRunLog } from '../src/logging/run-log.js';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const config = (extra: Record<string, string> = {}) =>
  loadConfig({
    OPENAI_API_KEY: 'offline-test-key',
    API_BASE_URL: 'http://127.0.0.1:3000',
    API_EMAIL: 'regular@example.com',
    API_PASSWORD: 'offline-test-password',
    ...extra,
  });

async function mockApi(
  handler: (req: IncomingMessage, res: ServerResponse) => void,
) {
  const server = createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert(address && typeof address !== 'string');
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
const json = (res: ServerResponse, value: unknown, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(value));
};
const login = (res: ServerResponse, token = 'test-token') =>
  json(res, { accessToken: token, expiresIn: 3600 });
const apiFor = (baseUrl: string) =>
  new ApiClient({
    baseUrl,
    email: 'regular@example.com',
    password: 'test',
    timeoutMs: 1000,
  });

class ScriptedModel extends BaseChatModel {
  constructor(private readonly responses: AIMessage[]) {
    super({});
  }
  _llmType() {
    return 'offline-scripted';
  }
  bindTools() {
    return this;
  }
  async _generate(messages: BaseMessage[]) {
    const index = messages.filter(
      (message) => message._getType() === 'ai',
    ).length;
    const message = this.responses[index];
    assert(message, 'El agente pidió una respuesta inesperada.');
    return { generations: [{ text: '', message }] };
  }
}
const call = (name: string, args: Record<string, unknown>, id: string) =>
  new AIMessage({
    content: '',
    tool_calls: [{ name, args, id, type: 'tool_call' }],
  });

test('config valida cron, credenciales y booleanos sin aceptar false como verdadero', () => {
  assert.equal(config().DRY_RUN, true);
  assert.equal(config({ DRY_RUN: 'false' }).DRY_RUN, false);
  assert.throws(() => config({ DRY_RUN: 'yes' }));
  assert.throws(() => config({ CRON_EXPRESSION: 'bad' }));
  assert.throws(() =>
    config({ API_BASE_URL: 'http://user:secret@example.com' }),
  );
  assert.throws(() => config({ API_PASSWORD: '' }));
});

test('HTTP autentica, pagina y renueva un token rechazado sin exponerlo', async () => {
  let logins = 0;
  let rejected = false;
  const server = await mockApi((req, res) => {
    if (req.url === '/auth/login') {
      logins++;
      login(res, `token-${logins}`);
      return;
    }
    assert.equal(req.headers.authorization, `Bearer token-${logins}`);
    if (!rejected) {
      rejected = true;
      json(res, {}, 401);
      return;
    }
    const page = Number(
      new URL(req.url!, 'http://test').searchParams.get('page'),
    );
    json(res, {
      documents: [{ id: page, type: 'OV', status: 'pending' }],
      pagination: { page, totalPages: 2 },
    });
  });
  try {
    assert.equal((await apiFor(server.url).listDocuments(2)).length, 2);
    assert.equal(logins, 2);
    await assert.rejects(
      apiFor(server.url).listDocuments(1),
      /MAX_DOCUMENT_PAGES/,
    );
  } finally {
    await server.close();
  }
});

test('LangChain ejecuta tools reales contra HTTP y factura una OV de otro dueño', async () => {
  const posts: unknown[] = [];
  const server = await mockApi((req, res) => {
    if (req.url === '/auth/login') {
      login(res);
      return;
    }
    if (req.url?.startsWith('/documents?')) {
      json(res, {
        documents: [
          { id: 1, type: 'OV', status: 'pending', userId: 999 },
          { id: 2, type: 'OTHER', status: 'pending' },
          { id: 3, type: 'OV', status: 'invoiced' },
        ],
        pagination: { page: 1, totalPages: 1 },
      });
      return;
    }
    if (req.url === '/documents/1') {
      json(res, { id: 1, type: 'OV', status: 'pending' });
      return;
    }
    if (req.url === '/invoices' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        posts.push(JSON.parse(body));
        json(
          res,
          {
            id: 50,
            documentId: 1,
            number: 'DEMO-OV-1',
            type: 'A',
            status: 'issued',
          },
          201,
        );
      });
      return;
    }
    json(res, {}, 404);
  });
  try {
    const log = createRunLog(false);
    const tools = createBillingTools(
      apiFor(server.url),
      config({ DRY_RUN: 'false' }),
      log,
    );
    const agent = createAgent({
      tools,
      systemPrompt: billingInstructions,
      model: new ScriptedModel([
        call('list_documents', {}, 'list'),
        call('create_invoice', { documentId: 1 }, 'invoice'),
        new AIMessage('Se creó una factura.'),
      ]),
    });
    await agent.invoke({
      messages: [{ role: 'user', content: 'Ejecutá facturación.' }],
    });
    assert.deepEqual(posts, [{ number: 'DEMO-OV-1', documentId: 1 }]);
    assert.equal(log.events[0]?.outcome, 'created');
    assert.equal(log.documentsListed, true);
  } finally {
    await server.close();
  }
});

test('tools bloquean IDs inventados, otros tipos, otros estados, duplicados y exceso del límite', async () => {
  const server = await mockApi((req, res) => {
    if (req.url === '/auth/login') {
      login(res);
      return;
    }
    if (req.url?.startsWith('/documents?')) {
      json(res, {
        documents: [
          { id: 1, type: 'OV', status: 'pending' },
          { id: 2, type: 'OTHER', status: 'pending' },
          { id: 3, type: 'OV', status: 'cancelled' },
          { id: 4, type: 'OV', status: 'pending' },
        ],
        pagination: { page: 1, totalPages: 1 },
      });
      return;
    }
    if (req.url === '/documents/1') {
      json(res, { id: 1, type: 'OV', status: 'pending' });
      return;
    }
    assert.fail(`Request inesperado ${req.method} ${req.url}`);
  });
  try {
    const log = createRunLog(true);
    const [list, issue] = createBillingTools(
      apiFor(server.url),
      config({ MAX_INVOICES_PER_RUN: '1' }),
      log,
    );
    assert(list && issue);
    assert('error' in (await issue.invoke({ documentId: 1 })));
    await list.invoke({});
    for (const documentId of [999, 2, 3])
      assert('error' in (await issue.invoke({ documentId })));
    assert.equal((await issue.invoke({ documentId: 1 })).outcome, 'simulated');
    assert('error' in (await issue.invoke({ documentId: 1 })));
    assert('error' in (await issue.invoke({ documentId: 4 })));
    assert.equal(log.events.length, 1);
  } finally {
    await server.close();
  }
});

test('reconsulta el estado y omite una orden facturada por otra ejecución', async () => {
  const server = await mockApi((req, res) => {
    if (req.url === '/auth/login') {
      login(res);
      return;
    }
    if (req.url?.startsWith('/documents?'))
      json(res, {
        documents: [{ id: 1, type: 'OV', status: 'pending' }],
        pagination: { page: 1, totalPages: 1 },
      });
    else json(res, { id: 1, type: 'OV', status: 'invoiced' });
  });
  try {
    const log = createRunLog(false);
    const [list, issue] = createBillingTools(
      apiFor(server.url),
      config({ DRY_RUN: 'false' }),
      log,
    );
    assert(list && issue);
    await list.invoke({});
    assert.equal((await issue.invoke({ documentId: 1 })).outcome, 'skipped');
  } finally {
    await server.close();
  }
});

test('un POST con fallo de red queda incierto y no se reintenta automáticamente', async () => {
  let posts = 0;
  const server = await mockApi((req, res) => {
    if (req.url === '/auth/login') {
      login(res);
      return;
    }
    if (req.url === '/invoices') {
      posts++;
      req.socket.destroy();
      return;
    }
    if (req.url?.startsWith('/documents?'))
      json(res, {
        documents: [{ id: 1, type: 'OV', status: 'pending' }],
        pagination: { page: 1, totalPages: 1 },
      });
    else json(res, { id: 1, type: 'OV', status: 'pending' });
  });
  try {
    const log = createRunLog(false);
    const [list, issue] = createBillingTools(
      apiFor(server.url),
      config({ DRY_RUN: 'false' }),
      log,
    );
    assert(list && issue);
    await list.invoke({});
    assert.equal((await issue.invoke({ documentId: 1 })).outcome, 'uncertain');
    await issue.invoke({ documentId: 1 });
    assert.equal(posts, 1);
  } finally {
    await server.close();
  }
});

test('guarda JSON de ejecución sin credenciales ni tokens', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'agent-log-'));
  try {
    const log = createRunLog(true);
    log.status = 'completed';
    const file = await saveRunLog(directory, log);
    assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), log);
    assert(!('password' in log));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
