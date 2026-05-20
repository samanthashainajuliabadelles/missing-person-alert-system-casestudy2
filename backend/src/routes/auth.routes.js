import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { runQuery } from '../config/neo4j.js';
import { nodeProps } from '../utils/record.js';

const router = express.Router();
const REGISTER_ROLES = ['Police Officer', 'Barangay Official'];

const cleanUser = (user) => {
  if (!user) return user;
  const copy = { ...user };
  delete copy.passwordHash;
  return copy;
};

const makeToken = (user) => jwt.sign(
  {
    id: user.id,
    email: user.email,
    role: user.role,
    assignment: user.assignment || '',
    assignmentType: user.assignmentType || ''
  },
  process.env.JWT_SECRET || 'dev_secret',
  { expiresIn: '8h' }
);

router.post('/register', async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role = 'Police Officer',
      assignment = '',
      assignmentType = ''
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (!REGISTER_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Registration is only for Police Officer or Barangay Official accounts. System admins are created by an administrator.' });
    }

    if (!assignment) {
      return res.status(400).json({ message: 'Please choose your assigned police station or barangay.' });
    }

    const existing = await runQuery('MATCH (u:User {email:$email}) RETURN u', { email });
    if (existing.length) return res.status(409).json({ message: 'Email already registered.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const records = await runQuery(`
      CREATE (u:User {
        id:$id, name:$name, email:$email, passwordHash:$passwordHash,
        role:$role, assignment:$assignment, assignmentType:$assignmentType,
        createdAt:datetime(), updatedAt:datetime()
      })
      RETURN u
    `, {
      id: uuid(),
      name,
      email,
      passwordHash,
      role,
      assignment,
      assignmentType: assignmentType || (role === 'Barangay Official' ? 'Barangay' : 'Police Station')
    });

    const user = cleanUser(nodeProps(records[0], 'u'));
    const token = makeToken(user);
    res.status(201).json({ token, user });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const records = await runQuery('MATCH (u:User {email:$email}) RETURN u', { email });
    if (!records.length) return res.status(401).json({ message: 'Invalid credentials' });

    const userWithPassword = nodeProps(records[0], 'u');
    const ok = await bcrypt.compare(password, userWithPassword.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const user = cleanUser(userWithPassword);
    const token = makeToken(user);
    res.json({ token, user });
  } catch (err) { next(err); }
});

export default router;
