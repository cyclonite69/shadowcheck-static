/**
 * AdminUsersService Unit Tests
 */

import * as adminUsersService from '../../../server/src/services/adminUsersService';
import bcrypt from 'bcrypt';
import { adminQuery } from '../../../server/src/services/adminDbService';
import { query } from '../../../server/src/config/database';
import logger from '../../../server/src/logging/logger';

jest.mock('bcrypt');
jest.mock('../../../server/src/services/adminDbService');
jest.mock('../../../server/src/config/database');
jest.mock('../../../server/src/logging/logger');

describe('AdminUsersService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listUsers', () => {
    it('should list all users', async () => {
      const mockUsers = [
        { id: 1, username: 'admin', email: 'admin@example.com', role: 'admin', is_active: true },
        { id: 2, username: 'user1', email: 'user1@example.com', role: 'user', is_active: true },
      ];
      (query as jest.Mock).mockResolvedValueOnce({ rows: mockUsers });

      const users = await adminUsersService.listUsers();

      expect(users).toEqual(mockUsers);
      expect(query).toHaveBeenCalled();
      const [sql, params] = (query as jest.Mock).mock.calls[0];
      expect(sql).toContain(
        'SELECT id, username, email, role, is_active, force_password_change, created_at, last_login'
      );
      expect(sql).toContain('FROM app.users');
      expect(sql).toContain('ORDER BY username ASC');
      expect(params).toBeUndefined();
    });

    it('should use fallback if force_password_change column is missing (42703)', async () => {
      const dbError = new Error('column does not exist');
      (dbError as any).code = '42703';
      (query as jest.Mock).mockRejectedValueOnce(dbError);

      const mockUsers = [{ id: 1, username: 'admin', force_password_change: false }];
      (query as jest.Mock).mockResolvedValueOnce({ rows: mockUsers });

      const users = await adminUsersService.listUsers();

      expect(users).toEqual(mockUsers);
      expect(query).toHaveBeenCalledTimes(2);
      const [sql, params] = (query as jest.Mock).mock.calls[1];
      expect(sql).toContain(
        'SELECT id, username, email, role, is_active, false AS force_password_change, created_at, last_login'
      );
      expect(sql).toContain('FROM app.users');
      expect(sql).toContain('ORDER BY username ASC');
      expect(params).toBeUndefined();
    });

    it('should throw other database errors', async () => {
      (query as jest.Mock).mockRejectedValueOnce(new Error('connection timeout'));

      await expect(adminUsersService.listUsers()).rejects.toThrow('connection timeout');
    });
  });

  describe('createAppUser', () => {
    const pwd = 'MOCK_PLAIN_PASSWORD';
    const h_pwd = 'MOCK_HASHED_PASSWORD';

    it('should create a new user', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(h_pwd);
      const mockUser = { id: 1, username: 'newuser', role: 'user' };
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const user = await adminUsersService.createAppUser(
        'newuser',
        'new@example.com',
        pwd,
        'user',
        true
      );

      expect(user).toEqual(mockUser);
      expect(bcrypt.hash).toHaveBeenCalledWith(pwd, 12);
      expect(adminQuery).toHaveBeenCalled();
      const [sql, params] = (adminQuery as jest.Mock).mock.calls[0];
      expect(sql).toContain(
        'INSERT INTO app.users (username, email, password_hash, role, force_password_change)'
      );
      expect(sql).toContain('VALUES ($1, $2, $3, $4, $5)');
      expect(sql).toContain(
        'RETURNING id, username, email, role, is_active, force_password_change, created_at, last_login'
      );
      expect(params).toEqual(['newuser', 'new@example.com', h_pwd, 'user', true]);
    });

    it('should create a new user with default role', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(h_pwd);
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await adminUsersService.createAppUser('newuser', 'new@example.com', pwd);

      expect(adminQuery).toHaveBeenCalled();
      const [sql, params] = (adminQuery as jest.Mock).mock.calls[0];
      expect(sql).toContain(
        'INSERT INTO app.users (username, email, password_hash, role, force_password_change)'
      );
      expect(params).toEqual(['newuser', 'new@example.com', h_pwd, 'user', false]);
    });

    it('should create a new user with undefined role and forcePasswordChange', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(h_pwd);
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await adminUsersService.createAppUser(
        'newuser',
        'new@example.com',
        pwd,
        undefined,
        undefined
      );

      expect(adminQuery).toHaveBeenCalled();
      const [sql, params] = (adminQuery as jest.Mock).mock.calls[0];
      expect(sql).toContain(
        'INSERT INTO app.users (username, email, password_hash, role, force_password_change)'
      );
      expect(params).toEqual(['newuser', 'new@example.com', h_pwd, 'user', false]);
    });

    it('should create an admin user', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(h_pwd);
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await adminUsersService.createAppUser('adminuser', 'admin@example.com', pwd, 'admin', false);

      expect(adminQuery).toHaveBeenCalled();
      const [sql, params] = (adminQuery as jest.Mock).mock.calls[0];
      expect(sql).toContain(
        'INSERT INTO app.users (username, email, password_hash, role, force_password_change)'
      );
      expect(params).toEqual(['adminuser', 'admin@example.com', h_pwd, 'admin', false]);
    });

    it('should use fallback if force_password_change column is missing', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(h_pwd);
      const dbError = new Error('column does not exist');
      (dbError as any).code = '42703';
      (adminQuery as jest.Mock).mockRejectedValueOnce(dbError);

      const mockUser = { id: 1, username: 'newuser', force_password_change: false };
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const user = await adminUsersService.createAppUser('newuser', 'new@example.com', pwd, 'user');

      expect(user).toEqual(mockUser);
      expect(adminQuery).toHaveBeenCalledTimes(2);
      const [sql, params] = (adminQuery as jest.Mock).mock.calls[1];
      expect(sql).toContain('INSERT INTO app.users (username, email, password_hash, role)');
      expect(sql).toContain('VALUES ($1, $2, $3, $4)');
      expect(sql).toContain(
        'RETURNING id, username, email, role, is_active, false AS force_password_change, created_at, last_login'
      );
      expect(sql).not.toContain('force_password_change)');
      expect(params).toEqual(['newuser', 'new@example.com', h_pwd, 'user']);
    });

    it('should throw if bcrypt hashing fails', async () => {
      (bcrypt.hash as jest.Mock).mockRejectedValueOnce(new Error('Hashing failed'));

      await expect(adminUsersService.createAppUser('u', 'e', 'p')).rejects.toThrow(
        'Hashing failed'
      );
    });

    it('should throw other database errors', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(h_pwd);
      (adminQuery as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      await expect(adminUsersService.createAppUser('u', 'e', 'p')).rejects.toThrow('DB error');
    });
  });

  describe('setAppUserActive', () => {
    it('should update user active status', async () => {
      const mockUser = { id: 1, username: 'user1', is_active: true };
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const user = await adminUsersService.setAppUserActive(1, true);

      expect(user).toEqual(mockUser);
      expect(adminQuery).toHaveBeenCalled();
      const [sql, params] = (adminQuery as jest.Mock).mock.calls[0];
      expect(sql).toContain('UPDATE app.users');
      expect(sql).toContain('SET is_active = $1');
      expect(sql).toContain('WHERE id = $2');
      expect(sql).toContain(
        'RETURNING id, username, email, role, is_active, force_password_change, created_at, last_login'
      );
      expect(params).toEqual([true, 1]);
    });

    it('should invalidate sessions when disabling a user', async () => {
      const mockUser = { id: 1, username: 'user1', is_active: false };
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rowCount: 5 });

      const user = await adminUsersService.setAppUserActive(1, false);

      expect(user).toEqual(mockUser);
      expect(adminQuery).toHaveBeenCalledTimes(2);
      const [sql, params] = (adminQuery as jest.Mock).mock.calls[1];
      expect(sql).toEqual('DELETE FROM app.user_sessions WHERE user_id = $1');
      expect(params).toEqual([1]);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Invalidated 5 sessions'));
    });

    it('should handle 0 invalidated sessions', async () => {
      const mockUser = { id: 1, username: 'user1', is_active: false };
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

      await adminUsersService.setAppUserActive(1, false);

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Invalidated 0 sessions'));
    });

    it('should log but not throw if session invalidation fails', async () => {
      const mockUser = { id: 1, username: 'user1', is_active: false };
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });
      (adminQuery as jest.Mock).mockRejectedValueOnce(new Error('session table missing'));

      const user = await adminUsersService.setAppUserActive(1, false);

      expect(user).toEqual(mockUser);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY CRITICAL: Failed to invalidate sessions'),
        expect.any(Object)
      );
    });

    it('should return null if user not found', async () => {
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const user = await adminUsersService.setAppUserActive(999, true);

      expect(user).toBeNull();
    });

    it('should handle column missing error', async () => {
      const dbError = new Error('column does not exist');
      (dbError as any).code = '42703';
      (adminQuery as jest.Mock).mockRejectedValueOnce(dbError);

      const mockUser = { id: 1, is_active: true };
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const user = await adminUsersService.setAppUserActive(1, true);

      expect(user).toEqual(mockUser);
      expect(adminQuery).toHaveBeenCalledTimes(2);
    });

    it('should throw other database errors', async () => {
      (adminQuery as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      await expect(adminUsersService.setAppUserActive(1, true)).rejects.toThrow('DB error');
    });
  });

  describe('resetAppUserPassword', () => {
    const pwd = 'MOCK_NEW_PASSWORD';
    const h_pwd = 'MOCK_NEW_HASHED_PASSWORD';

    it('should reset user password', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(h_pwd);
      const mockUser = { id: 1, username: 'user1' };
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const user = await adminUsersService.resetAppUserPassword(1, pwd, true);

      expect(user).toEqual(mockUser);
      expect(bcrypt.hash).toHaveBeenCalledWith(pwd, 12);
      expect(adminQuery).toHaveBeenCalled();
      const [sql, params] = (adminQuery as jest.Mock).mock.calls[0];
      expect(sql).toContain('UPDATE app.users');
      expect(sql).toContain('SET password_hash = $1, force_password_change = $2');
      expect(sql).toContain('WHERE id = $3');
      expect(sql).toContain(
        'RETURNING id, username, email, role, is_active, force_password_change, created_at, last_login'
      );
      expect(params).toEqual([h_pwd, true, 1]);
    });

    it('should reset user password with default forcePasswordChange', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(h_pwd);
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await adminUsersService.resetAppUserPassword(1, pwd);
      expect(adminQuery).toHaveBeenCalled();
      const [sql, params] = (adminQuery as jest.Mock).mock.calls[0];
      expect(sql).toContain('UPDATE app.users');
      expect(sql).toContain('SET password_hash = $1, force_password_change = $2');
      expect(params).toEqual([h_pwd, true, 1]);
    });

    it('should reset user password with undefined forcePasswordChange', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(h_pwd);
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await adminUsersService.resetAppUserPassword(1, pwd, undefined);

      expect(adminQuery).toHaveBeenCalled();
      const [sql, params] = (adminQuery as jest.Mock).mock.calls[0];
      expect(sql).toContain('UPDATE app.users');
      expect(sql).toContain('SET password_hash = $1, force_password_change = $2');
      expect(params).toEqual([h_pwd, true, 1]);
    });

    it('should reset user password with explicit forcePasswordChange=false', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(h_pwd);
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await adminUsersService.resetAppUserPassword(1, pwd, false);

      expect(adminQuery).toHaveBeenCalled();
      const [sql, params] = (adminQuery as jest.Mock).mock.calls[0];
      expect(sql).toContain('UPDATE app.users');
      expect(sql).toContain('SET password_hash = $1, force_password_change = $2');
      expect(params).toEqual([h_pwd, false, 1]);
    });

    it('should handle column missing error', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(h_pwd);
      const dbError = new Error('column does not exist');
      (dbError as any).code = '42703';
      (adminQuery as jest.Mock).mockRejectedValueOnce(dbError);

      const mockUser = { id: 1 };
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const user = await adminUsersService.resetAppUserPassword(1, pwd);

      expect(user).toEqual(mockUser);
      expect(adminQuery).toHaveBeenCalledTimes(2);
      const [sql, params] = (adminQuery as jest.Mock).mock.calls[1];
      expect(sql).toContain('UPDATE app.users');
      expect(sql).toContain('SET password_hash = $1');
      expect(sql).toContain('WHERE id = $2');
      expect(sql).toContain(
        'RETURNING id, username, email, role, is_active, false AS force_password_change, created_at, last_login'
      );
      expect(sql).not.toContain('force_password_change =');
      expect(params).toEqual([h_pwd, 1]);
    });

    it('should return null if user not found', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(h_pwd);
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const user = await adminUsersService.resetAppUserPassword(999, pwd);

      expect(user).toBeNull();
    });

    it('should throw if bcrypt hashing fails', async () => {
      (bcrypt.hash as jest.Mock).mockRejectedValueOnce(new Error('Hashing failed'));

      await expect(adminUsersService.resetAppUserPassword(1, pwd)).rejects.toThrow(
        'Hashing failed'
      );
    });

    it('should throw other database errors', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(h_pwd);
      (adminQuery as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      await expect(adminUsersService.resetAppUserPassword(1, pwd)).rejects.toThrow('DB error');
    });
  });
});
