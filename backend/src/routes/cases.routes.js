import express from 'express';
import { v4 as uuid } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { runQuery } from '../config/neo4j.js';
import { mapRecord, nodeProps } from '../utils/record.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

const mapCaseRecord = (rec) => {
  const row = mapRecord(rec);
  return {
    ...row.p.properties,
    report: row.r?.properties,
    location: row.l?.properties,
    barangay: row.b?.properties,
    guardian: row.g?.properties,
    agency: row.a?.properties
  };
};

router.get('/public', async (req, res, next) => {
  try {
    const { search = '', status = 'Active', urgency = '', barangay = '', sort = 'newest' } = req.query;

    const records = await runQuery(`
      MATCH (p:MissingPerson)-[:HAS_REPORT]->(r:Report)
      OPTIONAL MATCH (p)-[:LAST_SEEN_AT]->(l:Location)-[:PART_OF]->(b:Barangay)
      OPTIONAL MATCH (g:Guardian)-[:REPORTED]->(p)
      OPTIONAL MATCH (a:Agency)-[:HANDLES]->(r)
      WITH p, r, l, b, g, a,
        toLower(trim(coalesce($search, ''))) AS searchText,
        toLower(trim(coalesce($status, ''))) AS statusText,
        toLower(trim(coalesce($urgency, ''))) AS urgencyText,
        toLower(trim(coalesce($barangay, ''))) AS barangayText,
        coalesce($sort, 'newest') AS sortMode,
        toLower(coalesce(p.firstName, '') + ' ' + coalesce(p.lastName, '') + ' ' + coalesce(p.clothing, '') + ' ' + coalesce(p.description, '') + ' ' + coalesce(l.name, '') + ' ' + coalesce(l.address, '') + ' ' + coalesce(r.caseNumber, '')) AS searchableText,
        toLower(coalesce(p.firstName, '') + ' ' + coalesce(p.lastName, '')) AS fullName,
        CASE coalesce(p.urgencyLevel, '') WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 WHEN 'Low' THEN 4 ELSE 5 END AS urgencyRank,
        coalesce(p.createdAt, r.reportedAt, datetime('1970-01-01T00:00:00')) AS createdSort
      WHERE
        (searchText = '' OR searchableText CONTAINS searchText)
        AND (statusText = '' OR toLower(coalesce(p.status, '')) = statusText OR toLower(coalesce(r.status, '')) = statusText)
        AND (urgencyText = '' OR toLower(coalesce(p.urgencyLevel, '')) = urgencyText)
        AND (barangayText = '' OR toLower(coalesce(b.name, '')) CONTAINS barangayText)
      RETURN p, r, l, b, g, a, fullName, urgencyRank, createdSort, sortMode
      ORDER BY
        CASE WHEN sortMode = 'az' THEN fullName END ASC,
        CASE WHEN sortMode = 'za' THEN fullName END DESC,
        CASE WHEN sortMode = 'urgencyHigh' THEN urgencyRank END ASC,
        CASE WHEN sortMode = 'urgencyLow' THEN urgencyRank END DESC,
        CASE WHEN sortMode = 'oldest' THEN createdSort END ASC,
        CASE WHEN sortMode = 'newest' THEN createdSort END DESC,
        createdSort DESC
      LIMIT 60
    `, { search, status, urgency, barangay, sort });

    res.json(records.map(mapCaseRecord));
  } catch (err) {
    next(err);
  }
});

router.get('/public/:id', async (req, res, next) => {
  try {
    const records = await runQuery(`
      MATCH (p:MissingPerson {id:$id})-[:HAS_REPORT]->(r:Report)
      OPTIONAL MATCH (g:Guardian)-[:REPORTED]->(p)
      OPTIONAL MATCH (p)-[:LAST_SEEN_AT]->(l:Location)-[:PART_OF]->(b:Barangay)
      OPTIONAL MATCH (a:Agency)-[:HANDLES]->(r)
      RETURN p, r, g, l, b, a
    `, { id: req.params.id });

    if (!records.length) return res.status(404).json({ message: 'Case not found' });
    res.json(mapCaseRecord(records[0]));
  } catch (err) {
    next(err);
  }
});

router.use(requireAuth);

const uploadDir = 'uploads/cases';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedImageTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuid()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const imageOnlyUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!allowedImageTypes.includes(file.mimetype)) {
      return cb(new Error('Only image files are allowed. Please upload JPG, PNG, WEBP, or GIF.'));
    }

    cb(null, true);
  }
});

const safe = (v, fallback = '') => v ?? fallback;

const ADMIN_ROLES = ['Administrator', 'System Admin', 'Admin'];

const isAdminUser = user => ADMIN_ROLES.includes(user?.role);

const normalizeText = value => String(value || '').trim().toLowerCase();

const accessParams = req => ({
  isAdmin: isAdminUser(req.user),
  userRole: req.user?.role || '',
  userAssignment: normalizeText(req.user?.assignment)
});

const caseAccessCondition = `
  (
    $isAdmin = true
    OR (
      $userRole = 'Barangay Official'
      AND toLower(coalesce(b.name, '')) = $userAssignment
    )
    OR (
      $userRole = 'Police Officer'
      AND toLower(coalesce(a.name, '')) = $userAssignment
    )
  )
`;

const forceAssignmentOnCasePayload = (req, params) => {
  if (isAdminUser(req.user)) {
    return params;
  }

  if (req.user?.role === 'Barangay Official') {
    return {
      ...params,
      barangayName: req.user.assignment || params.barangayName
    };
  }

  if (req.user?.role === 'Police Officer') {
    return {
      ...params,
      agencyName: req.user.assignment || params.agencyName,
      agencyType: req.user.assignmentType || 'Police Station'
    };
  }

  return params;
};

router.get('/', async (req, res, next) => {
  try {
    const {
      search = '',
      status = '',
      urgency = '',
      barangay = '',
      sort = 'newest'
    } = req.query;

    const records = await runQuery(
      `
      MATCH (p:MissingPerson)-[:HAS_REPORT]->(r:Report)

      OPTIONAL MATCH (p)-[:LAST_SEEN_AT]->(l:Location)-[:PART_OF]->(b:Barangay)
      OPTIONAL MATCH (g:Guardian)-[:REPORTED]->(p)
      OPTIONAL MATCH (a:Agency)-[:HANDLES]->(r)

      WITH p, r, l, b, g, a,
        toLower(trim(coalesce($search, ''))) AS searchText,
        toLower(trim(coalesce($status, ''))) AS statusText,
        toLower(trim(coalesce($urgency, ''))) AS urgencyText,
        toLower(trim(coalesce($barangay, ''))) AS barangayText,
        coalesce($sort, 'newest') AS sortMode,

        toLower(
          coalesce(p.firstName, '') + ' ' +
          coalesce(p.lastName, '') + ' ' +
          coalesce(p.clothing, '') + ' ' +
          coalesce(p.description, '') + ' ' +
          coalesce(l.name, '') + ' ' +
          coalesce(l.address, '') + ' ' +
          coalesce(r.caseNumber, '') + ' ' +
          coalesce(a.name, '')
        ) AS searchableText,

        toLower(
          coalesce(p.firstName, '') + ' ' +
          coalesce(p.lastName, '')
        ) AS fullName,

        CASE coalesce(p.urgencyLevel, '')
          WHEN 'Critical' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
          ELSE 5
        END AS urgencyRank,

        coalesce(p.createdAt, r.reportedAt, datetime('1970-01-01T00:00:00')) AS createdSort,
        coalesce(p.updatedAt, p.createdAt, r.reportedAt, datetime('1970-01-01T00:00:00')) AS updatedSort

      WHERE
        ${caseAccessCondition}

        AND (
          searchText = ''
          OR searchableText CONTAINS searchText
        )

        AND (
          statusText = ''
          OR toLower(coalesce(p.status, '')) = statusText
          OR toLower(coalesce(r.status, '')) = statusText
        )

        AND (
          urgencyText = ''
          OR toLower(coalesce(p.urgencyLevel, '')) = urgencyText
          OR toLower(coalesce(p.urgency, '')) = urgencyText
        )

        AND (
          barangayText = ''
          OR toLower(coalesce(b.name, '')) CONTAINS barangayText
          OR toLower(coalesce(b.city, '')) CONTAINS barangayText
        )

      RETURN p, r, l, b, g, a, fullName, urgencyRank, createdSort, updatedSort, sortMode

      ORDER BY
        CASE WHEN sortMode = 'az' THEN fullName END ASC,
        CASE WHEN sortMode = 'za' THEN fullName END DESC,
        CASE WHEN sortMode = 'urgencyHigh' THEN urgencyRank END ASC,
        CASE WHEN sortMode = 'urgencyLow' THEN urgencyRank END DESC,
        CASE WHEN sortMode = 'oldest' THEN createdSort END ASC,
        CASE WHEN sortMode = 'edited' THEN updatedSort END DESC,
        CASE WHEN sortMode = 'newest' THEN createdSort END DESC,
        createdSort DESC
      `,
      {
        search,
        status,
        urgency,
        barangay,
        sort,
        ...accessParams(req)
      }
    );

    res.json(
      records.map(rec => {
        const row = mapRecord(rec);

        return {
          ...row.p.properties,
          report: row.r?.properties,
          location: row.l?.properties,
          barangay: row.b?.properties,
          guardian: row.g?.properties,
          agency: row.a?.properties
        };
      })
    );
  } catch (err) {
    next(err);
  }
});

router.post('/', imageOnlyUpload.single('photo'), async (req, res, next) => {
  try {
    const body = req.body;
    const uploadedPhotoUrl = req.file ? `/uploads/cases/${req.file.filename}` : '';
    const ids = {
      personId: uuid(), reportId: uuid(), guardianId: uuid(), locationId: uuid(), barangayId: uuid(), agencyId: uuid()
    };
    const caseNumber = `MP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    let params = {
      ...ids,
      caseNumber,
      firstName: safe(body.firstName),
      lastName: safe(body.lastName),
      age: Number(body.age || 0),
      gender: safe(body.gender),
      description: safe(body.description),
      clothing: safe(body.clothing),
      photoUrl: uploadedPhotoUrl,
      lastSeenDate: safe(body.lastSeenDate),
      status: body.status || 'Active',
      urgencyLevel: body.urgencyLevel || 'High',
      guardianName: safe(body.guardianName),
      guardianContact: safe(body.guardianContact),
      guardianAddress: safe(body.guardianAddress),
      locationName: safe(body.locationName),
      locationAddress: safe(body.locationAddress),
      lat: body.lat === '' || body.lat == null ? null : Number(body.lat),
      lng: body.lng === '' || body.lng == null ? null : Number(body.lng),
      barangayName: safe(body.barangayName),
      city: safe(body.city),
      province: safe(body.province),
      agencyName: safe(body.agencyName, 'Barangay Public Safety Office'),
      agencyType: safe(body.agencyType, 'Barangay'),
      agencyContact: safe(body.agencyContact),
      narrative: safe(body.narrative)
    };

    params = forceAssignmentOnCasePayload(req, params);

    const records = await runQuery(`
      CREATE (p:MissingPerson {
        id:$personId, firstName:$firstName, lastName:$lastName, age:$age, gender:$gender,
        description:$description, clothing:$clothing, photoUrl:$photoUrl, lastSeenDate:$lastSeenDate,
        status:$status, urgencyLevel:$urgencyLevel, createdAt:datetime(), updatedAt:datetime()
      })
      CREATE (g:Guardian {id:$guardianId, name:$guardianName, contact:$guardianContact, address:$guardianAddress, createdAt:datetime()})
      CREATE (r:Report {id:$reportId, caseNumber:$caseNumber, narrative:$narrative, status:'Open', reportedAt:datetime()})
      CREATE (l:Location {id:$locationId, name:$locationName, address:$locationAddress, lat:$lat, lng:$lng})
      MERGE (b:Barangay {name:$barangayName, city:$city, province:$province})
        ON CREATE SET b.id=$barangayId, b.createdAt=datetime()
      MERGE (a:Agency {name:$agencyName, type:$agencyType})
        ON CREATE SET a.id=$agencyId, a.contact=$agencyContact, a.createdAt=datetime()
        ON MATCH SET a.contact=coalesce($agencyContact, a.contact)
      CREATE (g)-[:REPORTED {reportedAt:datetime()}]->(p)
      CREATE (p)-[:HAS_REPORT]->(r)
      CREATE (p)-[:LAST_SEEN_AT]->(l)
      CREATE (l)-[:PART_OF]->(b)
      CREATE (a)-[:HANDLES {since:datetime()}]->(r)
      RETURN p
    `, params);

    res.status(201).json(nodeProps(records[0], 'p'));
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const records = await runQuery(
      `
      MATCH (p:MissingPerson {id:$id})-[:HAS_REPORT]->(r:Report)

      OPTIONAL MATCH (g:Guardian)-[:REPORTED]->(p)
      OPTIONAL MATCH (p)-[:LAST_SEEN_AT]->(l:Location)-[:PART_OF]->(b:Barangay)
      OPTIONAL MATCH (a:Agency)-[:HANDLES]->(r)

      WHERE ${caseAccessCondition}

      RETURN p, r, g, l, b, a
      `,
      {
        id: req.params.id,
        ...accessParams(req)
      }
    );

    if (!records.length) {
      return res.status(404).json({
        message: 'Case not found or you do not have access to this case.'
      });
    }

    const row = mapRecord(records[0]);

    res.json({
      ...row.p.properties,
      report: row.r?.properties,
      guardian: row.g?.properties,
      location: row.l?.properties,
      barangay: row.b?.properties,
      agency: row.a?.properties
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', imageOnlyUpload.single('photo'), async (req, res, next) => {
  try {
    const b = req.body;

    const uploadedPhotoUrl = req.file
      ? `/uploads/cases/${req.file.filename}`
      : safe(b.photoUrl);

    const records = await runQuery(
      `
      MATCH (p:MissingPerson {id:$id})-[:HAS_REPORT]->(r:Report)

      OPTIONAL MATCH (p)-[:LAST_SEEN_AT]->(l:Location)-[:PART_OF]->(bgy:Barangay)
      OPTIONAL MATCH (a:Agency)-[:HANDLES]->(r)

      WITH p, r, l, bgy AS b, a

      WHERE ${caseAccessCondition}

      SET p.firstName = $firstName,
          p.lastName = $lastName,
          p.age = $age,
          p.gender = $gender,
          p.description = $description,
          p.clothing = $clothing,
          p.lastSeenDate = $lastSeenDate,
          p.status = $status,
          p.urgencyLevel = $urgencyLevel,
          p.updatedAt = datetime(),
          p.photoUrl = CASE
            WHEN $photoUrl <> '' THEN $photoUrl
            ELSE p.photoUrl
          END

      RETURN p
      `,
      {
        id: req.params.id,
        firstName: safe(b.firstName),
        lastName: safe(b.lastName),
        age: Number(b.age || 0),
        gender: safe(b.gender),
        description: safe(b.description),
        clothing: safe(b.clothing),
        photoUrl: uploadedPhotoUrl,
        lastSeenDate: safe(b.lastSeenDate),
        status: b.status || 'Active',
        urgencyLevel: b.urgencyLevel || 'High',
        ...accessParams(req)
      }
    );

    if (!records.length) {
      return res.status(404).json({
        message: 'Case not found or you do not have access to edit this case.'
      });
    }

    res.json(nodeProps(records[0], 'p'));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const records = await runQuery(
      `
      MATCH (p:MissingPerson {id:$id})-[:HAS_REPORT]->(r:Report)

      OPTIONAL MATCH (p)-[:LAST_SEEN_AT]->(l:Location)-[:PART_OF]->(b:Barangay)
      OPTIONAL MATCH (a:Agency)-[:HANDLES]->(r)

      WHERE ${caseAccessCondition}

      DETACH DELETE p

      RETURN count(p) AS deleted
      `,
      {
        id: req.params.id,
        ...accessParams(req)
      }
    );

    res.json({
      message: 'Case deleted'
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/sightings', async (req, res, next) => {
  try {
    const b = req.body;
    const params = {
      caseId: req.params.id,
      sightingId: uuid(), witnessId: uuid(), locationId: uuid(), barangayId: uuid(), vehicleId: uuid(), cctvId: uuid(),
      witnessName: safe(b.witnessName), witnessContact: safe(b.witnessContact),
      dateTime: safe(b.dateTime), description: safe(b.description), confidence: b.confidence || 'Medium', status: b.status || 'Unverified',
      locationName: safe(b.locationName), locationAddress: safe(b.locationAddress),
      barangayName: safe(b.barangayName), city: safe(b.city), province: safe(b.province),
      vehiclePlate: safe(b.vehiclePlate), vehicleType: safe(b.vehicleType), vehicleColor: safe(b.vehicleColor), vehicleDescription: safe(b.vehicleDescription),
      cctvCode: safe(b.cctvCode), cctvLocation: safe(b.cctvLocation)
    };

    const records = await runQuery(`
      MATCH (p:MissingPerson {id:$caseId})
      CREATE (s:Sighting {id:$sightingId, dateTime:$dateTime, description:$description, confidence:$confidence, status:$status, createdAt:datetime(), updatedAt:datetime()})
      CREATE (w:Witness {id:$witnessId, name:$witnessName, contact:$witnessContact, createdAt:datetime()})
      CREATE (l:Location {id:$locationId, name:$locationName, address:$locationAddress})
      MERGE (b:Barangay {name:$barangayName, city:$city, province:$province})
        ON CREATE SET b.id=$barangayId, b.createdAt=datetime()
      CREATE (p)-[:HAS_SIGHTING]->(s)
      CREATE (w)-[:REPORTED]->(s)
      CREATE (s)-[:NEAR]->(l)
      CREATE (l)-[:PART_OF]->(b)
      FOREACH (_ IN CASE WHEN $vehiclePlate <> '' OR $vehicleDescription <> '' THEN [1] ELSE [] END |
        CREATE (v:Vehicle {id:$vehicleId, plateNumber:$vehiclePlate, type:$vehicleType, color:$vehicleColor, description:$vehicleDescription})
        CREATE (v)-[:SEEN_NEAR]->(s)
      )
      FOREACH (_ IN CASE WHEN $cctvCode <> '' OR $cctvLocation <> '' THEN [1] ELSE [] END |
        CREATE (c:CCTV {id:$cctvId, code:$cctvCode, locationDescription:$cctvLocation})
        CREATE (c)-[:COVERS]->(l)
      )
      RETURN s
    `, params);
    res.status(201).json(nodeProps(records[0], 's'));
  } catch (err) { next(err); }
});

router.get('/:id/sightings', async (req, res, next) => {
  try {
    const records = await runQuery(`
      MATCH (p:MissingPerson {id:$id})-[:HAS_SIGHTING]->(s:Sighting)
      OPTIONAL MATCH (w:Witness)-[:REPORTED]->(s)
      OPTIONAL MATCH (s)-[:NEAR]->(l:Location)-[:PART_OF]->(b:Barangay)
      OPTIONAL MATCH (v:Vehicle)-[:SEEN_NEAR]->(s)
      RETURN s, w, l, b, collect(v) AS vehicles
      ORDER BY s.dateTime DESC
    `, { id: req.params.id });
    res.json(records.map(mapRecord).map((row) => ({
      ...row.s.properties,
      witness: row.w?.properties,
      location: row.l?.properties,
      barangay: row.b?.properties,
      vehicles: (row.vehicles || []).map(v => v.properties)
    })));
  } catch (err) { next(err); }
});
router.patch('/:id/sightings/:sightingId/status', async (req, res, next) => {
  try {
    const validStatuses = [
      'Unverified',
      'Under Review',
      'Verified',
      'False alarm'
    ];

    const status = req.body.status || 'Unverified';

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Invalid sighting status.'
      });
    }

    const records = await runQuery(`
      MATCH (:MissingPerson {id:$id})-[:HAS_SIGHTING]->(s:Sighting {id:$sightingId})
      SET s.status = $status,
          s.updatedAt = datetime()
      RETURN s
    `, {
      id: req.params.id,
      sightingId: req.params.sightingId,
      status
    });

    if (!records.length) {
      return res.status(404).json({ message: 'Sighting not found' });
    }

    res.json(nodeProps(records[0], 's'));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/duplicates', async (req, res, next) => {
  try {
    const records = await runQuery(`
      MATCH (target:MissingPerson {id:$id})
      OPTIONAL MATCH (target)-[:LAST_SEEN_AT]->(:Location)-[:PART_OF]->(targetB:Barangay)
      OPTIONAL MATCH (targetGuardian:Guardian)-[:REPORTED]->(target)

      WITH target, targetB, targetGuardian

      MATCH (p:MissingPerson)
      WHERE p.id <> target.id

      OPTIONAL MATCH (p)-[:HAS_REPORT]->(r:Report)
      OPTIONAL MATCH (p)-[:LAST_SEEN_AT]->(l:Location)-[:PART_OF]->(b:Barangay)
      OPTIONAL MATCH (g:Guardian)-[:REPORTED]->(p)

      WITH target, targetB, targetGuardian, p, r, l, b, g,
        CASE 
          WHEN toLower(coalesce(p.firstName,'')) = toLower(coalesce(target.firstName,'')) 
          THEN 25 ELSE 0 
        END AS firstNameScore,

        CASE 
          WHEN toLower(coalesce(p.lastName,'')) = toLower(coalesce(target.lastName,'')) 
          THEN 25 ELSE 0 
        END AS lastNameScore,

        CASE 
          WHEN abs(coalesce(p.age,0) - coalesce(target.age,0)) <= 2 
          THEN 15 ELSE 0 
        END AS ageScore,

        CASE 
          WHEN toLower(coalesce(b.name,'')) = toLower(coalesce(targetB.name,'')) 
          THEN 15 ELSE 0 
        END AS barangayScore,

        CASE 
          WHEN coalesce(targetGuardian.contact,'') <> '' 
          AND targetGuardian.contact = g.contact 
          THEN 20 ELSE 0 
        END AS contactScore

      WITH p, r, l, b, g,
        firstNameScore + lastNameScore + ageScore + barangayScore + contactScore AS score

      WHERE score >= 30

      RETURN p, r, l, b, g, score
      ORDER BY score DESC, p.createdAt DESC
      LIMIT 6
    `, { id: req.params.id });

    res.json(records.map((rec) => {
      const row = mapRecord(rec);

      return {
        ...row.p.properties,
        report: row.r?.properties,
        location: row.l?.properties,
        barangay: row.b?.properties,
        guardian: row.g?.properties,
        score: row.score?.toNumber ? row.score.toNumber() : row.score
      };
    }));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/movement-path', async (req, res, next) => {
  try {
    const lastSeenRecords = await runQuery(`
      MATCH (p:MissingPerson {id:$id})
      OPTIONAL MATCH (p)-[:LAST_SEEN_AT]->(l:Location)
      OPTIONAL MATCH (l)-[:PART_OF]->(b:Barangay)
      RETURN p, l, b
    `, { id: req.params.id });

    if (!lastSeenRecords.length) {
      return res.status(404).json({ message: 'Case not found.' });
    }

    const lastRow = mapRecord(lastSeenRecords[0]);

    const points = [];

    if (lastRow.l) {
      points.push({
        type: 'Last seen',
        dateTime: lastRow.p?.properties?.lastSeenDate || '',
        location: lastRow.l.properties.name || '',
        address: lastRow.l.properties.address || '',
        barangay: lastRow.b?.properties?.name || '',
        status: 'Baseline',
        confidence: '',
        description: ''
      });
    }

    const sightingRecords = await runQuery(`
      MATCH (p:MissingPerson {id:$id})-[:HAS_SIGHTING]->(s:Sighting)
      OPTIONAL MATCH (s)-[:NEAR]->(l:Location)
      OPTIONAL MATCH (l)-[:PART_OF]->(b:Barangay)
      RETURN s, l, b
      ORDER BY s.dateTime ASC
    `, { id: req.params.id });

    sightingRecords.forEach((rec) => {
      const row = mapRecord(rec);

      points.push({
        type: 'Sighting',
        id: row.s?.properties?.id || '',
        dateTime: row.s?.properties?.dateTime || '',
        location: row.l?.properties?.name || '',
        address: row.l?.properties?.address || '',
        barangay: row.b?.properties?.name || '',
        status: row.s?.properties?.status || 'Unverified',
        confidence: row.s?.properties?.confidence || 'Medium',
        description: row.s?.properties?.description || ''
      });
    });

    res.json(points);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/related', async (req, res, next) => {
  try {
    const records = await runQuery(`
      MATCH (target:MissingPerson {id:$id})
      OPTIONAL MATCH (target)-[:LAST_SEEN_AT]->(:Location)-[:PART_OF]->(targetB:Barangay)
      OPTIONAL MATCH (target)-[:HAS_SIGHTING]->(:Sighting)<-[:SEEN_NEAR]-(targetV:Vehicle)

      WITH target, targetB,
        collect(DISTINCT toLower(coalesce(targetV.plateNumber,''))) AS targetPlates

      MATCH (p:MissingPerson)
      WHERE p.id <> target.id

      OPTIONAL MATCH (p)-[:HAS_REPORT]->(r:Report)
      OPTIONAL MATCH (p)-[:LAST_SEEN_AT]->(l:Location)-[:PART_OF]->(b:Barangay)
      OPTIONAL MATCH (p)-[:HAS_SIGHTING]->(s:Sighting)-[:NEAR]->(:Location)-[:PART_OF]->(sb:Barangay)
      OPTIONAL MATCH (p)-[:HAS_SIGHTING]->(:Sighting)<-[:SEEN_NEAR]-(v:Vehicle)

      WITH p, r, l, b, targetB, targetPlates,
        collect(DISTINCT sb.name) AS sightingBarangays,
        collect(DISTINCT toLower(coalesce(v.plateNumber,''))) AS plates

      WITH p, r, l, b,
        CASE 
          WHEN targetB.name IS NOT NULL 
          AND b.name IS NOT NULL
          AND toLower(b.name) = toLower(targetB.name)
          THEN ['Same last-seen barangay'] 
          ELSE [] 
        END +
        CASE 
          WHEN targetB.name IS NOT NULL 
          AND targetB.name IN sightingBarangays 
          THEN ['Sighting appeared in same barangay'] 
          ELSE [] 
        END +
        CASE 
          WHEN any(plate IN plates WHERE plate <> '' AND plate IN targetPlates) 
          THEN ['Shared vehicle plate/details'] 
          ELSE [] 
        END AS reasons

      WHERE size(reasons) > 0

      RETURN p, r, l, b, reasons
      ORDER BY size(reasons) DESC, p.createdAt DESC
      LIMIT 8
    `, { id: req.params.id });

    res.json(records.map((rec) => {
      const row = mapRecord(rec);

      return {
        ...row.p.properties,
        report: row.r?.properties,
        location: row.l?.properties,
        barangay: row.b?.properties,
        reasons: row.reasons || []
      };
    }));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/notes', async (req, res, next) => {
  try {
    const body = safe(req.body.body || req.body.content);
    const category = req.body.category || 'General';
    const author = req.body.author || 'System User';

    if (!body.trim()) {
      return res.status(400).json({
        message: 'Note content is required.'
      });
    }

    const records = await runQuery(`
      MATCH (p:MissingPerson {id:$id})
      CREATE (n:CaseNote {
        id:$noteId,
        body:$body,
        content:$body,
        category:$category,
        author:$author,
        createdAt:datetime()
      })
      CREATE (p)-[:HAS_NOTE]->(n)
      RETURN n
    `, {
      id: req.params.id,
      noteId: uuid(),
      body,
      category,
      author
    });

    if (!records.length) {
      return res.status(404).json({ message: 'Case not found.' });
    }

    res.status(201).json(nodeProps(records[0], 'n'));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/notes', async (req, res, next) => {
  try {
    const records = await runQuery(`
      MATCH (:MissingPerson {id:$id})-[:HAS_NOTE]->(n:CaseNote)
      RETURN n
      ORDER BY n.createdAt DESC
    `, { id: req.params.id });

    res.json(records.map((rec) => nodeProps(rec, 'n')));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/network', async (req, res, next) => {
  try {
    const records = await runQuery(`
      MATCH path=(p:MissingPerson {id:$id})-[*1..3]-(n)
      UNWIND nodes(path) AS node
      UNWIND relationships(path) AS rel
      RETURN collect(DISTINCT node) AS nodes, collect(DISTINCT rel) AS rels
    `, { id: req.params.id });
    if (!records.length) return res.json({ nodes: [], edges: [] });
    const row = mapRecord(records[0]);
    const nodes = row.nodes.map(n => ({ id: String(n.identity), label: n.labels[0], title: n.properties.name || n.properties.firstName || n.properties.caseNumber || n.properties.code || n.properties.body || n.properties.id, properties: n.properties }));
    const edges = row.rels.map(r => ({ id: String(r.identity), source: String(r.start), target: String(r.end), label: r.type }));
    res.json({ nodes, edges });
  } catch (err) { next(err); }
});

router.get('/:id/alert', async (req, res, next) => {
  try {
    const records = await runQuery(`
      MATCH (p:MissingPerson {id:$id})-[:LAST_SEEN_AT]->(l:Location)-[:PART_OF]->(b:Barangay)
      OPTIONAL MATCH (g:Guardian)-[:REPORTED]->(p)
      OPTIONAL MATCH (p)-[:HAS_REPORT]->(r:Report)
      RETURN p, l, b, g, r
    `, { id: req.params.id });
    if (!records.length) return res.status(404).json({ message: 'Case not found' });
    const row = mapRecord(records[0]);
    const p = row.p.properties, l = row.l.properties, brgy = row.b.properties, g = row.g?.properties, r = row.r?.properties;
    res.json({
      caseNumber: r?.caseNumber,
      title: `COMMUNITY ALERT: Missing Person - ${p.firstName} ${p.lastName}`,
      message: `Please help locate ${p.firstName} ${p.lastName}, ${p.age} years old, ${p.gender}. Last seen on ${p.lastSeenDate || 'an unspecified date'} at ${l.name || l.address}, ${brgy.name}, ${brgy.city}. Clothing/description: ${p.clothing || p.description || 'No details provided'}. Case urgency: ${p.urgencyLevel}. If seen, contact ${g?.name || 'the reporting guardian'} at ${g?.contact || 'the local barangay or police station'}. Do not approach suspicious situations alone; report sightings immediately.`,
      poster: {
        name: `${p.firstName} ${p.lastName}`,
        age: p.age,
        gender: p.gender,
        lastSeenDate: p.lastSeenDate,
        lastSeenLocation: `${l.name || l.address}, ${brgy.name}, ${brgy.city}`,
        clothing: p.clothing || p.description || 'No details provided',
        contact: g?.contact || 'Local barangay or police station',
        urgency: p.urgencyLevel
      }
    });
  } catch (err) { next(err); }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'Photo is too large. Maximum size is 5MB.'
      });
    }

    return res.status(400).json({
      message: err.message
    });
  }

  if (err.message?.includes('Only image files are allowed')) {
    return res.status(400).json({
      message: err.message
    });
  }

  next(err);
});

export default router;
