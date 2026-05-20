import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { runQuery } from '../config/neo4j.js';
import { nodeProps } from '../utils/record.js';

const router = express.Router();

const VALID_ROLES = ['Administrator', 'Police Officer', 'Barangay Official'];

const cleanUser = user => {
  if (!user) return user;

  const copy = { ...user };
  delete copy.passwordHash;

  return copy;
};

const normalizeUserPayload = body => {
  const role = body.role || 'Police Officer';

  return {
    name: body.name || '',
    email: body.email || '',
    password: body.password || '',
    role,
    assignment:
      role === 'Administrator'
        ? 'System Administration'
        : body.assignment || '',
    assignmentType:
      role === 'Administrator'
        ? 'System'
        : role === 'Barangay Official'
          ? 'Barangay'
          : 'Police Station'
  };
};

router.use(requireAuth, requireRole('Administrator', 'System Admin', 'Admin'));

router.get('/', async (req, res, next) => {
  try {
    const { role = '', assignment = '', search = '' } = req.query;

    const records = await runQuery(
      `
      MATCH (u:User)

      WITH u,
        toLower(trim(coalesce($role,''))) AS roleText,
        toLower(trim(coalesce($assignment,''))) AS assignmentText,
        toLower(trim(coalesce($search,''))) AS searchText,
        toLower(
          coalesce(u.name,'') + ' ' +
          coalesce(u.email,'') + ' ' +
          coalesce(u.role,'') + ' ' +
          coalesce(u.assignment,'')
        ) AS searchable

      WHERE
        (roleText = '' OR toLower(coalesce(u.role,'')) = roleText)
        AND (
          assignmentText = ''
          OR toLower(coalesce(u.assignment,'')) CONTAINS assignmentText
        )
        AND (
          searchText = ''
          OR searchable CONTAINS searchText
        )

      RETURN u
      ORDER BY coalesce(u.createdAt, datetime('1970-01-01T00:00:00')) DESC, u.name ASC
      `,
      { role, assignment, search }
    );

    res.json(records.map(record => cleanUser(nodeProps(record, 'u'))));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = normalizeUserPayload(req.body);
    const { name, email, password, role, assignment, assignmentType } = payload;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email, and password are required.'
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        message: 'Please choose a valid user role.'
      });
    }

    if (role !== 'Administrator' && !assignment) {
      return res.status(400).json({
        message: 'Assignment is required for police officers and barangay officials.'
      });
    }

    const existing = await runQuery(
      'MATCH (u:User {email:$email}) RETURN u',
      { email }
    );

    if (existing.length) {
      return res.status(409).json({
        message: 'Email already registered.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const records = await runQuery(
      `
      CREATE (u:User {
        id:$id,
        name:$name,
        email:$email,
        passwordHash:$passwordHash,
        role:$role,
        assignment:$assignment,
        assignmentType:$assignmentType,
        createdAt:datetime(),
        updatedAt:datetime()
      })

      RETURN u
      `,
      {
        id: uuid(),
        name,
        email,
        passwordHash,
        role,
        assignment,
        assignmentType
      }
    );

    res.status(201).json(cleanUser(nodeProps(records[0], 'u')));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const payload = normalizeUserPayload(req.body);
    const { name, email, password, role, assignment, assignmentType } = payload;

    if (!name || !email) {
      return res.status(400).json({
        message: 'Name and email are required.'
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        message: 'Please choose a valid user role.'
      });
    }

    if (role !== 'Administrator' && !assignment) {
      return res.status(400).json({
        message: 'Assignment is required for police officers and barangay officials.'
      });
    }

    const duplicate = await runQuery(
      `
      MATCH (u:User {email:$email})
      WHERE u.id <> $id
      RETURN u
      `,
      {
        id: req.params.id,
        email
      }
    );

    if (duplicate.length) {
      return res.status(409).json({
        message: 'Another user is already using this email.'
      });
    }

    let passwordHash = null;

    if (password && password.trim()) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const records = await runQuery(
      `
      MATCH (u:User {id:$id})

      SET u.name = $name,
          u.email = $email,
          u.role = $role,
          u.assignment = $assignment,
          u.assignmentType = $assignmentType,
          u.updatedAt = datetime()

      FOREACH (_ IN CASE WHEN $passwordHash IS NULL THEN [] ELSE [1] END |
        SET u.passwordHash = $passwordHash
      )

      RETURN u
      `,
      {
        id: req.params.id,
        name,
        email,
        role,
        assignment,
        assignmentType,
        passwordHash
      }
    );

    if (!records.length) {
      return res.status(404).json({
        message: 'User not found.'
      });
    }

    const updatedUser = cleanUser(nodeProps(records[0], 'u'));

    if (req.params.id === req.user.id) {
      return res.json({
        ...updatedUser,
        message:
          'Your own account was updated. Please log out and log in again to refresh your session.'
      });
    }

    res.json(updatedUser);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        message: 'You cannot delete your own account while logged in.'
      });
    }

    const records = await runQuery(
      `
      MATCH (u:User {id:$id})
      DETACH DELETE u
      RETURN count(u) AS deleted
      `,
      { id: req.params.id }
    );

    res.json({
      message: 'User deleted.'
    });
  } catch (err) {
    next(err);
  }
});

export default router;