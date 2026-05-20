import { toNative } from '../config/neo4j.js';

export const nodeProps = (record, key) => toNative(record.get(key)).properties;
export const mapRecord = (record) => Object.fromEntries(record.keys.map((key) => [key, toNative(record.get(key))]));
