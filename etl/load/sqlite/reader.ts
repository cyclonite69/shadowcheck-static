import sqlite3 from 'sqlite3';
import type { SqliteLocationRow, SqliteNetworkRow } from './types';

export class SqliteImportReader {
  private readonly sqliteFile: string;

  constructor(sqliteFile: string) {
    this.sqliteFile = sqliteFile;
  }

  async assertLocationTableExists(): Promise<void> {
    const row = await this.getSingleRow<{ count: number }>(
      'SELECT COUNT(*) as count FROM sqlite_master WHERE type="table" AND name="location"'
    );

    if (row.count === 0) {
      throw new Error('SQLite database missing "location" table');
    }
  }

  async countLocations(): Promise<number> {
    const row = await this.getSingleRow<{ count: number }>(
      'SELECT COUNT(*) as count FROM location'
    );
    return row.count || 0;
  }

  async countLocationsAtOrBefore(timeMs: number): Promise<number> {
    const row = await this.getSingleRow<{ count: number }>(
      'SELECT COUNT(*) as count FROM location WHERE time <= ?',
      [timeMs]
    );
    return row.count || 0;
  }

  async loadNetworkCache(): Promise<Map<string, SqliteNetworkRow>> {
    const rows = await this.getAllRows<SqliteNetworkRow>('SELECT * FROM network');
    const networkCache = new Map<string, SqliteNetworkRow>();

    for (const row of rows) {
      networkCache.set(row.bssid.toUpperCase(), row);
    }

    return networkCache;
  }

  async fetchNewObservations(sinceTimeMs: number): Promise<SqliteLocationRow[]> {
    return this.getAllRows<SqliteLocationRow>(
      'SELECT * FROM location WHERE time > ? ORDER BY time ASC',
      [sinceTimeMs]
    );
  }

  private async getSingleRow<T>(sql: string, params: unknown[] = []): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const db = new (sqlite3.verbose().Database)(this.sqliteFile, sqlite3.OPEN_READONLY);
      const handleResult = (err: Error | null, row: T): void => {
        db.close();
        if (err) {
          reject(new Error(`SQLite error: ${err.message}`));
          return;
        }
        resolve(row);
      };

      if (params.length === 0) {
        db.get(sql, handleResult);
        return;
      }

      db.get(sql, params, handleResult);
    });
  }

  private async getAllRows<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
      const db = new (sqlite3.verbose().Database)(this.sqliteFile, sqlite3.OPEN_READONLY);
      const handleResult = (err: Error | null, rows: T[]): void => {
        db.close();
        if (err) {
          reject(new Error(`SQLite error: ${err.message}`));
          return;
        }
        resolve(rows || []);
      };

      if (params.length === 0) {
        db.all(sql, handleResult);
        return;
      }

      db.all(sql, params, handleResult);
    });
  }
}
