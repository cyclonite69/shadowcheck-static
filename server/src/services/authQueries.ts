import { query } from '../config/database';

const getUserForLogin = async (username: string) => {
  try {
    return await query(
      `SELECT id, username, email, password_hash, role, is_active, force_password_change
       FROM app.users
       WHERE username = $1`,
      [username]
    );
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code !== '42703') {
      throw error;
    }
    return query(
      `SELECT id, username, email, password_hash, role, is_active, false AS force_password_change
       FROM app.users
       WHERE username = $1`,
      [username]
    );
  }
};

const getUserForPasswordChange = async (username: string) => {
  try {
    return await query(
      `SELECT id, username, password_hash, is_active, force_password_change
       FROM app.users
       WHERE username = $1`,
      [username]
    );
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code !== '42703') {
      throw error;
    }
    return query(
      `SELECT id, username, password_hash, is_active, false AS force_password_change
       FROM app.users
       WHERE username = $1`,
      [username]
    );
  }
};

const getSessionUser = async (tokenHash: string) => {
  try {
    return await query(
      `SELECT u.id, u.username, u.email, u.role, u.is_active, u.force_password_change, s.expires_at
       FROM app.user_sessions s
       JOIN app.users u ON s.user_id = u.id
       WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
      [tokenHash]
    );
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code !== '42703') {
      throw error;
    }
    return query(
      `SELECT u.id, u.username, u.email, u.role, u.is_active, false AS force_password_change, s.expires_at
       FROM app.user_sessions s
       JOIN app.users u ON s.user_id = u.id
       WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
      [tokenHash]
    );
  }
};

export { getSessionUser, getUserForLogin, getUserForPasswordChange };
