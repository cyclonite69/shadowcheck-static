import {
  getWigleDetail as getStoredWigleDetailRecord,
  getWigleV3Observations as getStoredWigleV3Observations,
  importWigleV3NetworkDetail as persistWigleV3NetworkDetail,
  importWigleV3ObservationRow as persistWigleV3ObservationRow,
  insertWigleV2SearchResult,
  insertWigleBtSearchResult,
} from '../../repositories/wiglePersistenceRepository';
import {
  mapV3LocationToObservationRow,
  normalizeMacAddress,
  type WigleV3ObservationRow,
} from '../wigleEnrichment/mappers/enrichmentMapper';
import { databaseExecutor, QueryExecutor } from './shared';

export async function getStoredWigleDetail(netid: string): Promise<any[]> {
  return getStoredWigleDetailRecord(databaseExecutor, netid);
}

export async function importWigleV3NetworkDetail(data: any): Promise<void> {
  await persistWigleV3NetworkDetail(databaseExecutor, data);
}

export async function importWigleV3Observation(
  netid: string,
  loc: any,
  ssid: string | null,
  cluster?: any
): Promise<number> {
  const row = mapV3LocationToObservationRow(
    normalizeMacAddress(netid) || netid,
    loc,
    cluster,
    ssid
  );
  return persistWigleV3ObservationRow(databaseExecutor, row);
}

export async function importWigleV3ObservationRow(row: WigleV3ObservationRow): Promise<number> {
  return persistWigleV3ObservationRow(databaseExecutor, row);
}

export async function getWigleV3Observations(netid: string): Promise<any[]> {
  return getStoredWigleV3Observations(databaseExecutor, netid);
}

export async function importWigleV2SearchResult(
  network: any,
  executor: QueryExecutor = databaseExecutor
): Promise<number> {
  return insertWigleV2SearchResult(executor, network);
}

export async function importWigleBtSearchResult(
  device: any,
  executor: QueryExecutor = databaseExecutor
): Promise<number> {
  return insertWigleBtSearchResult(executor, device);
}
