import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { runQuery } from '../config/neo4j.js';

const router = express.Router();

router.use(requireAuth);

const ADMIN_ROLES = ['Administrator', 'System Admin', 'Admin'];

const toNumber = value => {
  if (value == null) return 0;

  if (typeof value.toNumber === 'function') {
    return value.toNumber();
  }

  return Number(value || 0);
};

const normalize = value => String(value || '').trim().toLowerCase();

const getFreshUser = async req => {
  const possibleId =
    req.user?.id ||
    req.user?.userId ||
    req.user?._id ||
    req.user?.sub ||
    '';

  const possibleEmail = req.user?.email || '';

  const records = await runQuery(
    `
    MATCH (u:User)
    WHERE
      ($id <> '' AND u.id = $id)
      OR ($email <> '' AND toLower(u.email) = toLower($email))
    RETURN u
    LIMIT 1
    `,
    {
      id: possibleId,
      email: possibleEmail
    }
  );

  if (records.length) {
    return records[0].get('u').properties;
  }

  return req.user || {};
};

router.get('/', async (req, res, next) => {
  try {
    const freshUser = await getFreshUser(req);

    const role = freshUser.role || '';
    const assignment = freshUser.assignment || '';
    const normalizedAssignment = normalize(assignment);
    const isAdmin = ADMIN_ROLES.includes(role);

    const params = {
      isAdmin,
      role,
      assignment: normalizedAssignment
    };

    const debugScope = {
      role,
      assignment,
      assignmentType: freshUser.assignmentType || '',
      isAdmin
    };

    const baseCaseQuery = `
      MATCH (p:MissingPerson)-[:HAS_REPORT]->(r:Report)

      OPTIONAL MATCH (p)-[:LAST_SEEN_AT]->(:Location)-[:PART_OF]->(b:Barangay)
      OPTIONAL MATCH (a:Agency)-[:HANDLES]->(r)

      WITH p, r, b, a,
        toLower(trim(coalesce(b.name, ''))) AS barangayName,
        toLower(trim(coalesce(a.name, ''))) AS agencyName,
        toLower(trim(coalesce(r.reportedTo, ''))) AS reportedToName

      WHERE
        $isAdmin = true

        OR (
          $role = 'Police Officer'
          AND (
            agencyName = $assignment
            OR reportedToName = $assignment
          )
        )

        OR (
          $role = 'Barangay Official'
          AND barangayName = $assignment
        )
    `;

    const totalsRecords = await runQuery(
      `
      ${baseCaseQuery}

      WITH collect(DISTINCT p) AS scopedCases

      OPTIONAL MATCH (caseItem:MissingPerson)-[:HAS_SIGHTING]->(s:Sighting)
      WHERE caseItem IN scopedCases

      RETURN
        size(scopedCases) AS total,
        size([x IN scopedCases WHERE coalesce(x.status, '') = 'Active']) AS active,
        count(DISTINCT s) AS sightings
      `,
      params
    );

    const totalsRecord = totalsRecords[0];

    const totals = {
      total: toNumber(totalsRecord?.get('total')),
      active: toNumber(totalsRecord?.get('active')),
      sightings: toNumber(totalsRecord?.get('sightings'))
    };

    const byBarangayRecords = await runQuery(
      `
      ${baseCaseQuery}

      RETURN coalesce(b.name, 'Unknown') AS label, count(DISTINCT p) AS value
      ORDER BY value DESC, label ASC
      `,
      params
    );

    const byUrgencyRecords = await runQuery(
      `
      ${baseCaseQuery}

      WITH coalesce(p.urgencyLevel, 'Unknown') AS label, count(DISTINCT p) AS value

      RETURN label, value
      ORDER BY
        CASE label
          WHEN 'Critical' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
          ELSE 5
        END
      `,
      params
    );

    const urgentCaseRecords = await runQuery(
      `
      ${baseCaseQuery}

      AND coalesce(p.status, '') = 'Active'
      AND coalesce(p.urgencyLevel, '') IN ['Critical', 'High']

      RETURN
        p.id AS id,
        trim(coalesce(p.firstName, '') + ' ' + coalesce(p.lastName, '')) AS name,
        coalesce(b.name, 'Unknown') AS barangay,
        p.lastSeenDate AS lastSeenDate,
        p.urgencyLevel AS urgency

      ORDER BY
        CASE p.urgencyLevel
          WHEN 'Critical' THEN 1
          WHEN 'High' THEN 2
          ELSE 3
        END,
        coalesce(p.updatedAt, p.createdAt, datetime('1970-01-01T00:00:00')) DESC

      LIMIT 8
      `,
      params
    );

    const recentSightingRecords = await runQuery(
      `
      ${baseCaseQuery}

      WITH DISTINCT p

      MATCH (p)-[:HAS_SIGHTING]->(s:Sighting)
      OPTIONAL MATCH (s)-[:NEAR]->(:Location)-[:PART_OF]->(sb:Barangay)

      RETURN
        trim(coalesce(p.firstName, '') + ' ' + coalesce(p.lastName, '')) AS person,
        s.description AS description,
        coalesce(sb.name, 'Unknown') AS barangay,
        s.dateTime AS dateTime,
        s.status AS status

      ORDER BY coalesce(s.createdAt, datetime('1970-01-01T00:00:00')) DESC
      LIMIT 8
      `,
      params
    );

    res.json({
      scope: debugScope,

      totals,

      byBarangay: byBarangayRecords.map(record => ({
        label: record.get('label'),
        value: toNumber(record.get('value'))
      })),

      byUrgency: byUrgencyRecords.map(record => ({
        label: record.get('label'),
        value: toNumber(record.get('value'))
      })),

      urgentCases: urgentCaseRecords.map(record => ({
        id: record.get('id'),
        name: record.get('name'),
        barangay: record.get('barangay'),
        lastSeenDate: record.get('lastSeenDate'),
        urgency: record.get('urgency')
      })),

      recentSightings: recentSightingRecords.map(record => ({
        person: record.get('person'),
        description: record.get('description'),
        barangay: record.get('barangay'),
        dateTime: record.get('dateTime'),
        status: record.get('status')
      }))
    });
  } catch (err) {
    next(err);
  }
});

export default router;