import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const user = process.env.NEO4J_USER || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'password';
const database = process.env.NEO4J_DATABASE || 'neo4j';

export const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

export async function runQuery(cypher, params = {}) {
  const session = driver.session({ database });
  try {
    const result = await session.run(cypher, params);
    return result.records;
  } finally {
    await session.close();
  }
}

export function toNative(value) {
  if (neo4j.isInt(value)) return value.toNumber();
  if (Array.isArray(value)) return value.map(toNative);
  if (value && typeof value === 'object') {
    if (value.properties) {
      return {
        identity: value.identity ? toNative(value.identity) : undefined,
        labels: value.labels,
        type: value.type,
        start: value.start ? toNative(value.start) : undefined,
        end: value.end ? toNative(value.end) : undefined,
        properties: toNative(value.properties)
      };
    }
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toNative(v)]));
  }
  return value;
}

export async function initConstraints() {
  const constraints = [
    'CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE',
    'CREATE CONSTRAINT user_email IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE',
    'CREATE CONSTRAINT person_id IF NOT EXISTS FOR (p:MissingPerson) REQUIRE p.id IS UNIQUE',
    'CREATE CONSTRAINT guardian_id IF NOT EXISTS FOR (g:Guardian) REQUIRE g.id IS UNIQUE',
    'CREATE CONSTRAINT report_id IF NOT EXISTS FOR (r:Report) REQUIRE r.id IS UNIQUE',
    'CREATE CONSTRAINT location_id IF NOT EXISTS FOR (l:Location) REQUIRE l.id IS UNIQUE',
    'CREATE CONSTRAINT barangay_id IF NOT EXISTS FOR (b:Barangay) REQUIRE b.id IS UNIQUE',
    'CREATE CONSTRAINT agency_id IF NOT EXISTS FOR (a:Agency) REQUIRE a.id IS UNIQUE',
    'CREATE CONSTRAINT sighting_id IF NOT EXISTS FOR (s:Sighting) REQUIRE s.id IS UNIQUE',
    'CREATE CONSTRAINT witness_id IF NOT EXISTS FOR (w:Witness) REQUIRE w.id IS UNIQUE',
    'CREATE CONSTRAINT vehicle_id IF NOT EXISTS FOR (v:Vehicle) REQUIRE v.id IS UNIQUE',
    'CREATE CONSTRAINT cctv_id IF NOT EXISTS FOR (c:CCTV) REQUIRE c.id IS UNIQUE'
  ];
  for (const c of constraints) await runQuery(c);
}

export async function closeDriver() {
  await driver.close();
}
