import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';

const baseUrl = process.env.BASE_URL || 'http://localhost:4321';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required for verification.');
  process.exit(1);
}

const { Pool } = pg;

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

const run = async () => {
  await waitForHealth();
  const userId = await ensureUser();

  const conv = await postJson(`${baseUrl}/api/conversations/create`, {
    title: 'Hello World Save Note',
    initialPrompt: 'Create a hello world text note saved shortcut',
    userId,
    model: 'gpt-4o'
  });

  requireOk(conv.id, 'Conversation creation failed');

  const response = await postJson(`${baseUrl}/api/conversations/${conv.id}/messages`, {
    content: 'Create a hello world text note saved shortcut',
    model: 'gpt-4o',
    reasoningOptions: {}
  });

  requireOk(response.shortcut, 'No shortcut returned from AI');
  requireOk(Array.isArray(response.shortcut.actions), 'Shortcut actions missing');

  const actionTypes = response.shortcut.actions.map(action => action.type);
  requireOk(actionTypes.includes('text'), 'Expected text action missing');
  requireOk(actionTypes.includes('save_file'), 'Expected save_file action missing');

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
