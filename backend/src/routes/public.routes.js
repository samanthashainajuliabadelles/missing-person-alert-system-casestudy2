import express from 'express';
import { runQuery } from '../config/neo4j.js';
import { mapRecord } from '../utils/record.js';

const router = express.Router();

const serializeCase = (rec) => {
  const row = mapRecord(rec);
  return {
    ...row.p.properties,
    report: row.r?.properties,
    location: row.l?.properties,
    barangay: row.b?.properties,
    agency: row.a?.properties
  };
};

router.get('/cases', async (req, res, next) => {
  try {
    const { search = '', barangay = '', status = 'Active' } = req.query;

    const records = await runQuery(`
      MATCH (p:MissingPerson)-[:HAS_REPORT]->(r:Report)
      OPTIONAL MATCH (p)-[:LAST_SEEN_AT]->(l:Location)-[:PART_OF]->(b:Barangay)
      OPTIONAL MATCH (a:Agency)-[:HANDLES]->(r)
      WITH p, r, l, b, a,
        toLower(trim($search)) AS searchText,
        toLower(trim($barangay)) AS barangayText,
        toLower(trim($status)) AS statusText
      WHERE
        (searchText = '' OR toLower(coalesce(p.firstName,'') + ' ' + coalesce(p.lastName,'') + ' ' + coalesce(p.clothing,'') + ' ' + coalesce(l.name,'')) CONTAINS searchText)
        AND (barangayText = '' OR toLower(coalesce(b.name,'')) CONTAINS barangayText)
        AND (statusText = '' OR toLower(coalesce(p.status,'')) = statusText)
      RETURN p, r, l, b, a
      ORDER BY p.createdAt DESC
    `, { search, barangay, status });

    res.json(records.map(serializeCase));
  } catch (err) { next(err); }
});

router.get('/cases/:id', async (req, res, next) => {
  try {
    const records = await runQuery(`
      MATCH (p:MissingPerson {id:$id})-[:HAS_REPORT]->(r:Report)
      OPTIONAL MATCH (p)-[:LAST_SEEN_AT]->(l:Location)-[:PART_OF]->(b:Barangay)
      OPTIONAL MATCH (a:Agency)-[:HANDLES]->(r)
      RETURN p, r, l, b, a
    `, { id: req.params.id });

    if (!records.length) return res.status(404).json({ message: 'Case not found.' });
    res.json(serializeCase(records[0]));
  } catch (err) { next(err); }
});

router.get('/hotlines', async (req, res, next) => {
  try {
    const records = await runQuery(`
      MATCH (a:Agency)
      WHERE a.type = 'Police'
      RETURN a
      ORDER BY a.stationNumber
    `);
    res.json(records.map((rec) => mapRecord(rec).a.properties));
  } catch (err) { next(err); }
});

export default router;
