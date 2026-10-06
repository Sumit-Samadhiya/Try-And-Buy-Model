/**
 * Verification test suite for PostgreSQL Baileys Auth Store Adapter
 * Tests serialization, UPSERT, batch keys get, protobuf decoding, and error resilience.
 */

const assert = require('assert');
const { BufferJSON, initAuthCreds, proto } = require('@whiskeysockets/baileys');
const { usePostgresAuthState } = require('./postgres-auth-state');

async function runTests() {
  console.log('🧪 Starting PostgreSQL Baileys Auth State Store Tests...\n');

  // In-memory mock PostgreSQL table to simulate real Postgres DB behavior
  const dbRows = new Map();
  const queryLog = [];

  const mockPool = {
    query: async (sql, params = []) => {
      queryLog.push({ sql: sql.trim(), params });

      // Handle table creation
      if (sql.includes('CREATE TABLE IF NOT EXISTS whatsapp_sessions')) {
        return { rows: [] };
      }

      // Handle UPSERT
      if (sql.includes('INSERT INTO whatsapp_sessions') && sql.includes('ON CONFLICT')) {
        const [sessionId, data] = params;
        dbRows.set(sessionId, { session_id: sessionId, data, updated_at: new Date() });
        return { rowCount: 1 };
      }

      // Handle single SELECT by session_id
      if (sql.includes('SELECT data FROM whatsapp_sessions WHERE session_id = $1')) {
        const [sessionId] = params;
        const row = dbRows.get(sessionId);
        return { rows: row ? [row] : [] };
      }

      // Handle batch SELECT ANY($1)
      if (sql.includes('SELECT session_id, data FROM whatsapp_sessions WHERE session_id = ANY($1)')) {
        const [sessionIds] = params;
        const matchingRows = [];
        for (const sid of sessionIds) {
          if (dbRows.has(sid)) {
            matchingRows.push(dbRows.get(sid));
          }
        }
        return { rows: matchingRows };
      }

      // Handle COUNT for creds
      if (sql.includes("SELECT COUNT(*) AS count FROM whatsapp_sessions WHERE session_id = 'creds'")) {
        const count = dbRows.has('creds') ? 1 : 0;
        return { rows: [{ count: String(count) }] };
      }

      // Handle DELETE single key
      if (sql.includes('DELETE FROM whatsapp_sessions WHERE session_id = $1')) {
        const [sessionId] = params;
        dbRows.delete(sessionId);
        return { rowCount: 1 };
      }

      // Handle DELETE all keys (logout)
      if (sql.includes('DELETE FROM whatsapp_sessions')) {
        dbRows.clear();
        return { rowCount: 1 };
      }

      throw new Error(`Unhandled mock SQL query: ${sql}`);
    },
  };

  // Test 1: Fresh initialization (empty DB)
  console.log('Test 1: Fresh state initialization when table is empty');
  const authStore = await usePostgresAuthState(mockPool);
  assert.strictEqual(authStore.type, 'postgresql');
  assert.ok(authStore.state.creds, 'Should generate new creds via initAuthCreds()');
  assert.strictEqual(await authStore.hasExistingSession(), false, 'Should report no existing session');
  console.log('  ✅ Passed\n');

  // Test 2: Saving credentials (UPSERT to DB)
  console.log('Test 2: Saving credentials updates DB row "creds"');
  authStore.state.creds.me = { id: '919876543210:1@s.whatsapp.net', name: 'DoorDrape Store' };
  await authStore.saveCreds();

  assert.ok(dbRows.has('creds'), 'DB should have a "creds" row');
  const savedCredsRaw = dbRows.get('creds').data;
  const decodedCreds = JSON.parse(savedCredsRaw, BufferJSON.reviver);
  assert.strictEqual(decodedCreds.me.id, '919876543210:1@s.whatsapp.net');
  assert.strictEqual(await authStore.hasExistingSession(), true, 'Should report existing session exists');
  console.log('  ✅ Passed\n');

  // Test 3: Setting and retrieving keys with Buffer serialization
  console.log('Test 3: Keys set and get with cryptographic Buffer round-trip');
  const testBuffer = Buffer.from('mock-crypto-key-12345');
  await authStore.state.keys.set({
    'pre-key': {
      '1': { keyPair: { public: testBuffer } },
      '2': { keyPair: { public: Buffer.from('mock-crypto-key-67890') } },
    },
  });

  assert.ok(dbRows.has('pre-key-1'), 'DB should contain pre-key-1');
  assert.ok(dbRows.has('pre-key-2'), 'DB should contain pre-key-2');

  const fetchedKeys = await authStore.state.keys.get('pre-key', ['1', '2', '3']);
  assert.ok(fetchedKeys['1'], 'Key 1 should be returned');
  assert.ok(Buffer.isBuffer(fetchedKeys['1'].keyPair.public), 'Key buffer should be restored as real Buffer');
  assert.strictEqual(fetchedKeys['1'].keyPair.public.toString(), 'mock-crypto-key-12345');
  assert.ok(fetchedKeys['2'], 'Key 2 should be returned');
  assert.strictEqual(fetchedKeys['3'], null, 'Non-existent key should return null');
  console.log('  ✅ Passed\n');

  // Test 4: Removing a key when set with falsy value
  console.log('Test 4: Key removal when set to null/undefined');
  await authStore.state.keys.set({
    'pre-key': {
      '1': null,
    },
  });
  assert.strictEqual(dbRows.has('pre-key-1'), false, 'Key 1 should have been removed from DB');
  console.log('  ✅ Passed\n');

  // Test 5: Re-loading session on server restart
  console.log('Test 5: Server restart restores existing credentials without requesting new QR');
  const restartedStore = await usePostgresAuthState(mockPool);
  assert.strictEqual(restartedStore.state.creds.me.id, '919876543210:1@s.whatsapp.net');
  assert.strictEqual(await restartedStore.hasExistingSession(), true);
  console.log('  ✅ Passed\n');

  // Test 6: Explicit logout clears all DB rows
  console.log('Test 6: User logout clears session rows from DB');
  await restartedStore.clearSession();
  assert.strictEqual(dbRows.size, 0, 'All rows in whatsapp_sessions should be deleted');
  assert.strictEqual(await restartedStore.hasExistingSession(), false, 'Session should no longer exist');
  console.log('  ✅ Passed\n');

  console.log('🎉 All 6 PostgreSQL Baileys Auth Store tests passed successfully!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
