/**
 * PostgreSQL Baileys Authentication State Store
 *
 * Persists Baileys credentials and cryptographic key states into PostgreSQL
 * to survive server sleep/restarts on ephemeral platforms like Render.
 */

const { Pool } = require('pg');
const { BufferJSON, initAuthCreds, proto } = require('@whiskeysockets/baileys');

/**
 * Initializes the PostgreSQL pool and ensures the whatsapp_sessions table exists.
 * @param {string} connectionString - PostgreSQL connection URL
 * @returns {Promise<Pool>}
 */
async function createPostgresPool(connectionString) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10,
  });

  // Verify connection
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_sessions (
        session_id VARCHAR(128) PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[WhatsApp Service] ✅ PostgreSQL "whatsapp_sessions" table verified / ready.');
  } finally {
    client.release();
  }

  return pool;
}

/**
 * Creates a Baileys auth state adapter backed by a PostgreSQL pool.
 * @param {Pool} pool - pg Pool instance
 * @returns {Promise<{state: {creds: any, keys: {get: Function, set: Function}}, saveCreds: Function, clearSession: Function, hasExistingSession: Function, type: string}>}
 */
async function usePostgresAuthState(pool) {
  const writeData = async (data, sessionId) => {
    try {
      const serialized = JSON.stringify(data, BufferJSON.replacer);
      await pool.query(
        `INSERT INTO whatsapp_sessions (session_id, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (session_id)
         DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [sessionId, serialized]
      );
    } catch (err) {
      console.error(`[WhatsApp Service] Error writing session key "${sessionId}" to DB:`, err.message);
      throw err;
    }
  };

  const readData = async (sessionId) => {
    try {
      const res = await pool.query(
        'SELECT data FROM whatsapp_sessions WHERE session_id = $1',
        [sessionId]
      );
      if (res.rows.length === 0 || !res.rows[0].data) return null;
      return JSON.parse(res.rows[0].data, BufferJSON.reviver);
    } catch (err) {
      console.error(`[WhatsApp Service] Error reading session key "${sessionId}" from DB:`, err.message);
      return null;
    }
  };

  const removeData = async (sessionId) => {
    try {
      await pool.query('DELETE FROM whatsapp_sessions WHERE session_id = $1', [sessionId]);
    } catch (err) {
      console.error(`[WhatsApp Service] Error deleting session key "${sessionId}" from DB:`, err.message);
    }
  };

  const clearSession = async () => {
    try {
      await pool.query('DELETE FROM whatsapp_sessions');
      console.log('[WhatsApp Service] All session keys cleared from PostgreSQL.');
    } catch (err) {
      console.error('[WhatsApp Service] Error clearing whatsapp_sessions table:', err.message);
    }
  };

  const hasExistingSession = async () => {
    try {
      const res = await pool.query(
        "SELECT COUNT(*) AS count FROM whatsapp_sessions WHERE session_id = 'creds'"
      );
      return parseInt(res.rows[0]?.count || '0', 10) > 0;
    } catch (_) {
      return false;
    }
  };

  const existingCreds = await readData('creds');
  const creds = existingCreds || initAuthCreds();

  if (existingCreds) {
    console.log('[WhatsApp Service] 🔄 Restored existing WhatsApp credentials from PostgreSQL.');
  } else {
    console.log('[WhatsApp Service] 🆕 Initialized new WhatsApp credentials (pending QR scan).');
  }

  return {
    type: 'postgresql',
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          if (!ids || ids.length === 0) return data;

          const sessionIds = ids.map(id => `${type}-${id}`);
          try {
            const res = await pool.query(
              'SELECT session_id, data FROM whatsapp_sessions WHERE session_id = ANY($1)',
              [sessionIds]
            );

            const foundMap = new Map();
            for (const row of res.rows) {
              if (row.data) {
                try {
                  let value = JSON.parse(row.data, BufferJSON.reviver);
                  if (type === 'app-state-sync-key' && value) {
                    value = proto.Message.AppStateSyncKeyData.fromObject(value);
                  }
                  foundMap.set(row.session_id, value);
                } catch (e) {
                  console.error(`[WhatsApp Service] Error parsing key "${row.session_id}":`, e.message);
                }
              }
            }

            for (const id of ids) {
              const sid = `${type}-${id}`;
              data[id] = foundMap.has(sid) ? foundMap.get(sid) : null;
            }
          } catch (err) {
            console.error(`[WhatsApp Service] Batch key fetch error for "${type}":`, err.message);
            for (const id of ids) {
              data[id] = null;
            }
          }

          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const sid = `${category}-${id}`;
              if (value) {
                tasks.push(writeData(value, sid));
              } else {
                tasks.push(removeData(sid));
              }
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: async () => {
      return writeData(creds, 'creds');
    },
    clearSession,
    hasExistingSession,
  };
}

module.exports = {
  createPostgresPool,
  usePostgresAuthState,
};
