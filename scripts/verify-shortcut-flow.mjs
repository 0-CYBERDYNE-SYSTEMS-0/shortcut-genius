import { setTimeout as delay } from 'node:timers/promises';

const baseUrl = process.env.BASE_URL || 'http://localhost:4321';
const databaseUrl = process.env.DATABASE_URL;

const requireOk = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const postJson = async (url, payload) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}: ${data.error || data.message || 'unknown error'}`);
  }
  return data;
};

const waitForHealth = async () => {
  for (let i = 0; i < 30; i += 1) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) {
        return true;
      }
    } catch {}
    await delay(1000);
  }
  throw new Error('Server not healthy within 30s.');
};

const ensureUser = async () => {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to bootstrap a database user.');
  }

  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await pool.query(
      "insert into users (username, password) values ('localuser','localpass') on conflict (username) do nothing"
    );
    const result = await pool.query("select id from users where username='localuser' limit 1");
    requireOk(result.rows.length > 0, 'Failed to ensure local user');
    return result.rows[0].id;
  } finally {
    await pool.end();
  }
};

const signMultipart = async (path, payload) => {
  const boundary = `----sgBoundary${Math.random().toString(16).slice(2)}`;
  const chunks = [];

  const addField = (name, value) => {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(Buffer.from(`Content-Disposition: form-data; name=\"${name}\"\r\n\r\n`));
    chunks.push(Buffer.from(`${value}\r\n`));
  };

  const addFile = (name, filename, bytes) => {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(Buffer.from(`Content-Disposition: form-data; name=\"${name}\"; filename=\"${filename}\"\r\n`));
    chunks.push(Buffer.from('Content-Type: application/octet-stream\r\n\r\n'));
    chunks.push(Buffer.from(bytes));
    chunks.push(Buffer.from('\r\n'));
  };

  Object.entries(payload.fields || {}).forEach(([key, value]) => addField(key, value));
  addFile(payload.fileField, payload.filename, payload.fileBytes);
  chunks.push(Buffer.from(`--${boundary}--\r\n`));

  const body = Buffer.concat(chunks);
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body
  });

  if (!res.ok) {
    const data = await res.text();
    throw new Error(`HTTP ${res.status} from ${path}: ${data}`);
  }

  return res;
};

const createConversation = async (payload) => {
  try {
    return await postJson(`${baseUrl}/api/conversations/create`, payload);
  } catch (error) {
    // If strict DB-backed routes enforce a user FK, bootstrap one and retry.
    if (!databaseUrl) {
      throw error;
    }

    const userId = await ensureUser();
    return postJson(`${baseUrl}/api/conversations/create`, {
      ...payload,
      userId
    });
  }
};

const run = async () => {
  await waitForHealth();
  const conv = await createConversation({
    title: 'Hello World Note',
    initialPrompt: 'Create a hello world note in Notes',
    userId: 1,
    model: 'gpt-4o'
  });

  requireOk(conv.id, 'Conversation creation failed');

  const response = await postJson(`${baseUrl}/api/conversations/${conv.id}/messages`, {
    content: 'Create a hello world note in Notes',
    model: 'gpt-4o',
    reasoningOptions: {}
  });

  requireOk(response.shortcut, 'No shortcut returned from AI');
  requireOk(Array.isArray(response.shortcut.actions), 'Shortcut actions missing');

  const actionTypes = response.shortcut.actions.map(action => String(action.type || '').toLowerCase());
  requireOk(
    actionTypes.includes('create_note') || actionTypes.includes('is.workflow.actions.createnote'),
    'Expected Notes action missing from generated shortcut'
  );

  const buildRes = await fetch(`${baseUrl}/api/shortcuts/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shortcut: response.shortcut })
  });
  requireOk(buildRes.ok, 'Build shortcut failed');
  const buildBytes = Buffer.from(await buildRes.arrayBuffer());
  requireOk(buildBytes.length > 0, 'Built shortcut file empty');

  const signingInfo = await (await fetch(`${baseUrl}/api/shortcuts/signing-info`)).json();
  requireOk(signingInfo.available, 'Signing not available');

  const signRes = await signMultipart(`${baseUrl}/api/shortcuts/sign`, {
    fields: { mode: 'anyone' },
    fileField: 'shortcut',
    filename: 'hello.shortcut',
    fileBytes: buildBytes
  });
  const signedBytes = Buffer.from(await signRes.arrayBuffer());
  requireOk(signedBytes.length > 0, 'Signed shortcut file empty');

  const verifyRes = await signMultipart(`${baseUrl}/api/shortcuts/verify`, {
    fileField: 'shortcut',
    filename: 'signed.shortcut',
    fileBytes: signedBytes
  });
  const verify = await verifyRes.json();
  requireOk(verify.signed === true && verify.valid === true, 'Signed shortcut verification failed');

  console.log('✅ End-to-end shortcut flow verified successfully.');
};

run().catch(error => {
  console.error('❌ Verification failed:', error.message);
  process.exit(1);
});
