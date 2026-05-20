import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { runQuery } from '../config/neo4j.js';
import { mapRecord } from '../utils/record.js';

const router = express.Router();
router.use(requireAuth);

router.get('/download', async (req, res, next) => {
  try {
    const nodeRecords = await runQuery('MATCH (n) RETURN id(n) AS identity, labels(n) AS labels, properties(n) AS properties ORDER BY identity');
    const relRecords = await runQuery('MATCH (a)-[r]->(b) RETURN id(r) AS identity, type(r) AS type, id(a) AS start, id(b) AS end, properties(r) AS properties ORDER BY identity');

    const backup = {
      exportedAt: new Date().toISOString(),
      app: 'Missing Person and Community Alert Graph System',
      nodes: nodeRecords.map(mapRecord),
      relationships: relRecords.map(mapRecord)
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="missing-person-backup-${Date.now()}.json"`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (err) { next(err); }
});

export default router;
