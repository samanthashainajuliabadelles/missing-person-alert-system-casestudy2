import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { initConstraints, runQuery, closeDriver } from './config/neo4j.js';

await initConstraints();

const CITY = 'Iligan City';
const PROVINCE = 'Lanao del Norte';
const REGION = 'Region X - Northern Mindanao';

const iliganBarangays = [
  { name: 'Abuno', code: '1030900001', type: 'Urban', population2024: 6506 },
  { name: 'Bonbonon', code: '1030900002', type: 'Rural', population2024: 2701 },
  { name: 'Bunawan', code: '1030900003', type: 'Rural', population2024: 2093 },
  { name: 'Buru-un', code: '1030900005', type: 'Urban', population2024: 17714 },
  { name: 'Dalipuga', code: '1030900006', type: 'Urban', population2024: 21200 },
  { name: 'Digkilaan', code: '1030900007', type: 'Urban', population2024: 6089 },
  { name: 'Hinaplanon', code: '1030900008', type: 'Urban', population2024: 16155 },
  { name: 'Kabacsanan', code: '1030900010', type: 'Rural', population2024: 2267 },
  { name: 'Kiwalan', code: '1030900011', type: 'Urban', population2024: 7742 },
  { name: 'Mahayahay', code: '1030900012', type: 'Urban', population2024: 8092 },
  { name: 'Mainit', code: '1030900013', type: 'Rural', population2024: 2798 },
  { name: 'Mandulog', code: '1030900014', type: 'Rural', population2024: 4612 },
  { name: 'Maria Cristina', code: '1030900015', type: 'Urban', population2024: 11458 },
  { name: 'Palao', code: '1030900016', type: 'Urban', population2024: 10832 },
  { name: 'Poblacion', code: '1030900017', type: 'Urban', population2024: 3615 },
  { name: 'Puga-an', code: '1030900018', type: 'Urban', population2024: 7151 },
  { name: 'Rogongon', code: '1030900019', type: 'Urban', population2024: 7699 },
  { name: 'Santa Elena', code: '1030900021', type: 'Urban', population2024: 11000 },
  { name: 'Santa Filomena', code: '1030900022', type: 'Urban', population2024: 7016 },
  { name: 'Suarez', code: '1030900024', type: 'Urban', population2024: 19184 },
  { name: 'Tambacan', code: '1030900025', type: 'Urban', population2024: 17796 },
  { name: 'Saray', code: '1030900026', type: 'Urban', population2024: 9347 },
  { name: 'Tipanoy', code: '1030900027', type: 'Urban', population2024: 15388 },
  { name: 'Tomas L. Cabili', code: '1030900028', type: 'Urban', population2024: 10225 },
  { name: 'Upper Tominobo', code: '1030900029', type: 'Rural', population2024: 3892 },
  { name: 'Tubod', code: '1030900030', type: 'Urban', population2024: 31813 },
  { name: 'Bagong Silang', code: '1030900031', type: 'Urban', population2024: 6808 },
  { name: 'Del Carmen', code: '1030900032', type: 'Urban', population2024: 9631 },
  { name: 'Dulag', code: '1030900033', type: 'Rural', population2024: 1234 },
  { name: 'San Miguel', code: '1030900034', type: 'Urban', population2024: 3722 },
  { name: 'Santiago', code: '1030900035', type: 'Urban', population2024: 9063 },
  { name: 'Santo Rosario', code: '1030900036', type: 'Rural', population2024: 2029 },
  { name: 'Tibanga', code: '1030900037', type: 'Urban', population2024: 8003 },
  { name: 'Acmac-Mariano Badelles Sr.', code: '1030900038', type: 'Urban', population2024: 6986 },
  { name: 'Ditucalan', code: '1030900039', type: 'Urban', population2024: 4303 },
  { name: 'Hindang', code: '1030900040', type: 'Rural', population2024: 990 },
  { name: 'Kalilangan', code: '1030900041', type: 'Rural', population2024: 2042 },
  { name: 'Lanipao', code: '1030900042', type: 'Rural', population2024: 2924 },
  { name: 'Luinab', code: '1030900043', type: 'Urban', population2024: 11359 },
  { name: 'Panoroganan', code: '1030900044', type: 'Rural', population2024: 1822 },
  { name: 'San Roque', code: '1030900045', type: 'Urban', population2024: 5321 },
  { name: 'Ubaldo Laya', code: '1030900046', type: 'Urban', population2024: 15124 },
  { name: 'Upper Hinaplanon', code: '1030900047', type: 'Urban', population2024: 6627 },
  { name: 'Villa Verde', code: '1030900048', type: 'Urban', population2024: 5759 }
];

const iliganAgencies = [
  {
    name: 'Iligan City Police Office Headquarters',
    shortName: 'Headquarters',
    stationNumber: 'Headquarters',
    area: 'Iligan City',
    type: 'Police',
    contact: '0917-712-7411 / 0998-598-7004',
    city: CITY,
    province: PROVINCE,
    emergencyContact: '911',
    socialFacebook: 'Iligan CPO',
    socialInstagram: 'iligan_cpo',
    socialX: 'IliganCPO_HQs'
  },
  {
    name: 'Police Station 1 - Tambo',
    shortName: 'Police Station 1',
    stationNumber: '1',
    area: 'Tambo',
    type: 'Police',
    contact: '0917-166-3440',
    city: CITY,
    province: PROVINCE,
    emergencyContact: '911'
  },
  {
    name: 'Police Station 2 - Nunucan',
    shortName: 'Police Station 2',
    stationNumber: '2',
    area: 'Nunucan',
    type: 'Police',
    contact: '0917-715-1844',
    city: CITY,
    province: PROVINCE,
    emergencyContact: '911'
  },
  {
    name: 'Police Station 3 - Tag-ibo',
    shortName: 'Police Station 3',
    stationNumber: '3',
    area: 'Tag-ibo',
    type: 'Police',
    contact: '0998-598-7010',
    city: CITY,
    province: PROVINCE,
    emergencyContact: '911'
  },
  {
    name: 'Police Station 4 - Tubod',
    shortName: 'Police Station 4',
    stationNumber: '4',
    area: 'Tubod',
    type: 'Police',
    contact: '0998-598-7012',
    city: CITY,
    province: PROVINCE,
    emergencyContact: '911'
  },
  {
    name: 'Police Station 5 - Poblacion',
    shortName: 'Police Station 5',
    stationNumber: '5',
    area: 'Poblacion',
    type: 'Police',
    contact: '0926-425-1015',
    city: CITY,
    province: PROVINCE,
    emergencyContact: '911'
  },
  {
    name: 'Police Station 6',
    shortName: 'Police Station 6',
    stationNumber: '6',
    area: 'Iligan City',
    type: 'Police',
    contact: '0930-105-9808',
    city: CITY,
    province: PROVINCE,
    emergencyContact: '911'
  },
  {
    name: 'Iligan City Mobile Force Company',
    shortName: 'Mobile Force Company',
    stationNumber: 'Mobile Force',
    area: 'Iligan City',
    type: 'Police',
    contact: '0955-901-6880',
    city: CITY,
    province: PROVINCE,
    emergencyContact: '911'
  },
  {
    name: 'Iligan City Disaster Risk Reduction and Management Office',
    shortName: 'CDRRMO',
    stationNumber: 'CDRRMO',
    area: 'Iligan City',
    type: 'CDRRMO',
    contact: 'Emergency Operations Center / 911',
    city: CITY,
    province: PROVINCE,
    emergencyContact: '911'
  },
  {
    name: 'MSU-IIT Campus Security and Safety Office',
    shortName: 'MSU-IIT Security',
    stationNumber: 'Campus Security',
    area: 'Tibanga',
    type: 'Campus Security',
    contact: 'Campus Hotline',
    city: CITY,
    province: PROVINCE,
    emergencyContact: '911'
  }
];

const policeStationCoverage = [
  {
    agency: 'Police Station 1 - Tambo',
    barangays: ['Tibanga', 'Saray', 'San Miguel', 'Poblacion']
  },
  {
    agency: 'Police Station 2 - Nunucan',
    barangays: ['Kiwalan', 'Dalipuga', 'Santa Filomena', 'Bonbonon']
  },
  {
    agency: 'Police Station 3 - Tag-ibo',
    barangays: ['Tomas L. Cabili', 'Hinaplanon', 'Bagong Silang', 'Tipanoy']
  },
  {
    agency: 'Police Station 4 - Tubod',
    barangays: ['Tubod', 'Ubaldo Laya', 'Suarez', 'Del Carmen']
  },
  {
    agency: 'Police Station 5 - Poblacion',
    barangays: ['Poblacion', 'Mahayahay', 'Tambacan', 'Palao']
  },
  {
    agency: 'Police Station 6',
    barangays: ['Buru-un', 'Maria Cristina', 'Ditucalan', 'Upper Hinaplanon']
  }
];

const seededUsers = [
  {
    name: 'Police Station 4 Staff',
    email: 'ps4@bantaymissing.ph',
    password: 'ps4123',
    role: 'Police Officer',
    assignment: 'Police Station 4 - Tubod',
    assignmentType: 'Police Station'
  },
  {
    name: 'Police Station 5 Staff',
    email: 'ps5@bantaymissing.ph',
    password: 'ps5123',
    role: 'Police Officer',
    assignment: 'Police Station 5 - Poblacion',
    assignmentType: 'Police Station'
  },
  {
    name: 'Tubod Barangay Official',
    email: 'tubod@bantaymissing.ph',
    password: 'tubod123',
    role: 'Barangay Official',
    assignment: 'Tubod',
    assignmentType: 'Barangay'
  },
  {
    name: 'Palao Barangay Official',
    email: 'palao@bantaymissing.ph',
    password: 'palao123',
    role: 'Barangay Official',
    assignment: 'Palao',
    assignmentType: 'Barangay'
  }
];

for (const user of seededUsers) {
  const userPasswordHash = await bcrypt.hash(user.password, 10);

  await runQuery(
    `
    MERGE (u:User {email:$email})
    ON CREATE SET
      u.id = $id,
      u.name = $name,
      u.passwordHash = $passwordHash,
      u.role = $role,
      u.assignment = $assignment,
      u.assignmentType = $assignmentType,
      u.createdAt = datetime(),
      u.updatedAt = datetime()

    ON MATCH SET
      u.name = $name,
      u.passwordHash = $passwordHash,
      u.role = $role,
      u.assignment = $assignment,
      u.assignmentType = $assignmentType,
      u.updatedAt = datetime()
    `,
    {
      id: uuid(),
      name: user.name,
      email: user.email,
      passwordHash: userPasswordHash,
      role: user.role,
      assignment: user.assignment,
      assignmentType: user.assignmentType
    }
  );
}

await runQuery(`
UNWIND $coverage AS station
MATCH (a:Agency {name:station.agency})
UNWIND station.barangays AS barangayName
MATCH (b:Barangay {name:barangayName, city:$city})
MERGE (a)-[:COVERS_BARANGAY]->(b)
`, { coverage: policeStationCoverage, city: CITY });

await runQuery(`
MATCH (n) WHERE n:MissingPerson OR n:Guardian OR n:Report OR n:Location OR n:Barangay OR n:Agency OR n:Sighting OR n:Witness OR n:Vehicle OR n:CCTV OR n:City
DETACH DELETE n
`);

const passwordHash = await bcrypt.hash('admin123', 10);
await runQuery(`
MERGE (u:User {email:'admin@bantaymissing.ph'})
ON CREATE SET u.id=$id, u.name='Iligan Admin Responder', u.passwordHash=$passwordHash, u.role='Administrator', u.createdAt=datetime()
ON MATCH SET u.passwordHash=$passwordHash, u.name='Iligan Admin Responder', u.role='Administrator'
`, { id: uuid(), passwordHash });

await runQuery(`
MERGE (c:City {name:$city, province:$province})
ON CREATE SET c.id=$cityId, c.region=$region, c.createdAt=datetime()
ON MATCH SET c.region=$region
WITH c
UNWIND $barangays AS row
MERGE (b:Barangay {name:row.name, city:$city, province:$province})
ON CREATE SET b.id=randomUUID(), b.createdAt=datetime()
SET b.psgcCode=row.code, b.urbanRural=row.type, b.population2024=row.population2024, b.region=$region
MERGE (b)-[:PART_OF_CITY]->(c)
`, { city: CITY, province: PROVINCE, region: REGION, cityId: uuid(), barangays: iliganBarangays });

await runQuery(`
UNWIND $agencies AS row
MERGE (a:Agency {name:row.name, type:row.type})
ON CREATE SET a.id=randomUUID(), a.createdAt=datetime()
SET 
  a.shortName = row.shortName,
  a.stationNumber = row.stationNumber,
  a.area = row.area,
  a.contact = row.contact,
  a.city = row.city,
  a.province = row.province,
  a.emergencyContact = row.emergencyContact,
  a.socialFacebook = coalesce(row.socialFacebook, ''),
  a.socialInstagram = coalesce(row.socialInstagram, ''),
  a.socialX = coalesce(row.socialX, '')
`, { agencies: iliganAgencies });

const cases = [
  {
    person: { firstName: 'Mika', lastName: 'Santos', age: 16, gender: 'Female', description: 'Senior high school student, shoulder-length black hair', clothing: 'White blouse, navy skirt, black backpack', lastSeenDate: '2026-05-18 17:30', status: 'Active', urgencyLevel: 'Critical' },
    guardian: { name: 'Ana Santos', contact: '0917-000-1111', address: 'Purok 4, Barangay Mahayahay, Iligan City' },
    report: { caseNumber: 'MP-ILG-2026-100001', narrative: 'Last seen after leaving school and walking toward a public transport terminal.' },
    location: { name: 'MSU-IIT Main Gate Area', address: 'A. Bonifacio Avenue, Tibanga, Iligan City', barangay: 'Tibanga' },
    agency: 'Police Station 1 - Tambo',
    sightings: [
      { witness: { name: 'Jun Mercado', contact: '0999-222-3333' }, dateTime: '2026-05-18 18:05', description: 'Student matching the description was seen near the jeepney stop outside the campus area.', confidence: 'High', status: 'Unverified', location: { name: 'Jeepney Stop near MSU-IIT', address: 'A. Bonifacio Avenue', barangay: 'Tibanga' }, vehicle: { type: 'Jeepney', color: 'Green', description: 'Public utility jeepney heading toward Palao' }, cctv: { code: 'CCTV-TIB-001', locationDescription: 'Roadside store CCTV facing A. Bonifacio Avenue' } },
      { witness: { name: 'Lara Villanueva', contact: '0918-555-4433' }, dateTime: '2026-05-18 18:40', description: 'Possible sighting near a food stall area along the city proper route.', confidence: 'Medium', status: 'Unverified', location: { name: 'Food Stall Area near Gaisano', address: 'City proper route', barangay: 'Palao' }, vehicle: { type: 'Tricycle', color: 'Blue', description: 'Blue tricycle near the roadside' }, cctv: { code: 'CCTV-PAL-004', locationDescription: 'Storefront CCTV near food stalls' } }
    ]
  },

  {
    person: { firstName: 'Carlo', lastName: 'Dela Cruz', age: 11, gender: 'Male', description: 'Grade school pupil, short hair, slim build', clothing: 'Red shirt, denim shorts, slippers', lastSeenDate: '2026-05-19 15:20', status: 'Active', urgencyLevel: 'High' },
    guardian: { name: 'Ramon Dela Cruz', contact: '0920-111-7788', address: 'Barangay Tubod, Iligan City' },
    report: { caseNumber: 'MP-ILG-2026-100002', narrative: 'Child did not return home after playing near the barangay basketball court.' },
    location: { name: 'Tubod Basketball Court', address: 'Near residential purok area', barangay: 'Tubod' },
    agency: 'Police Station 4 - Tubod',
    sightings: [
      { witness: { name: 'Nena Flores', contact: '0935-222-8899' }, dateTime: '2026-05-19 16:00', description: 'Child with similar clothing was seen walking toward a sari-sari store.', confidence: 'Medium', status: 'Unverified', location: { name: 'Sari-sari Store near Tubod Road', address: 'Tubod interior road', barangay: 'Tubod' }, vehicle: { type: '', color: '', description: '' }, cctv: { code: 'CCTV-TUB-009', locationDescription: 'Barangay-owned CCTV near road corner' } }
    ]
  },

  {
    person: { firstName: 'Jessa', lastName: 'Morales', age: 14, gender: 'Female', description: 'Junior high school student with long brown hair', clothing: 'Yellow shirt, black jeans, white sandals', lastSeenDate: '2026-05-20 13:45', status: 'Active', urgencyLevel: 'Critical' },
    guardian: { name: 'Lorna Morales', contact: '0915-222-1001', address: 'Purok 6, Barangay Tubod, Iligan City' },
    report: { caseNumber: 'MP-ILG-2026-100004', narrative: 'Last seen leaving a neighborhood store after buying school supplies.' },
    location: { name: 'Tubod Neighborhood Store', address: 'Interior road near Tubod barangay hall', barangay: 'Tubod' },
    agency: 'Police Station 4 - Tubod',
    sightings: [
      { witness: { name: 'Edgar Flores', contact: '0928-441-8891' }, dateTime: '2026-05-20 14:10', description: 'Possible sighting near a motorcycle parking area in Tubod.', confidence: 'Medium', status: 'Unverified', location: { name: 'Motorcycle Parking Area', address: 'Tubod main road', barangay: 'Tubod' }, vehicle: { type: 'Motorcycle', color: 'Black', description: 'Black motorcycle seen parked nearby' }, cctv: { code: 'CCTV-TUB-014', locationDescription: 'Small store CCTV facing Tubod road' } }
    ]
  },

  {
    person: { firstName: 'Nico', lastName: 'Bautista', age: 18, gender: 'Male', description: 'College freshman, medium build, short curly hair', clothing: 'Blue jacket, gray shirt, rubber shoes', lastSeenDate: '2026-05-20 19:25', status: 'Active', urgencyLevel: 'High' },
    guardian: { name: 'Elena Bautista', contact: '0919-771-2234', address: 'Barangay Ubaldo Laya, Iligan City' },
    report: { caseNumber: 'MP-ILG-2026-100005', narrative: 'Reported missing after failing to return from a basketball practice.' },
    location: { name: 'Ubaldo Laya Covered Court', address: 'Near barangay road', barangay: 'Ubaldo Laya' },
    agency: 'Police Station 4 - Tubod',
    sightings: [
      { witness: { name: 'Mario Lacsamana', contact: '0907-330-4455' }, dateTime: '2026-05-20 20:05', description: 'Seen walking toward the highway with a backpack.', confidence: 'High', status: 'Unverified', location: { name: 'Ubaldo Laya Highway Corner', address: 'Highway corner', barangay: 'Ubaldo Laya' }, vehicle: { type: 'Van', color: 'White', description: 'White van passed the area minutes later' }, cctv: { code: 'CCTV-UBL-002', locationDescription: 'Barangay road corner CCTV' } }
    ]
  },

  {
    person: { firstName: 'Rhea', lastName: 'Lim', age: 27, gender: 'Female', description: 'Office worker, shoulder-length hair, wearing eyeglasses', clothing: 'Pink blouse, black slacks, brown handbag', lastSeenDate: '2026-05-16 18:00', status: 'Found', urgencyLevel: 'Medium' },
    guardian: { name: 'Robert Lim', contact: '0926-090-5512', address: 'Barangay Suarez, Iligan City' },
    report: { caseNumber: 'MP-ILG-2026-100006', narrative: 'Reported missing after not arriving home from work. Later contacted family safely.' },
    location: { name: 'Suarez Jeepney Stop', address: 'Near Suarez public road', barangay: 'Suarez' },
    agency: 'Police Station 4 - Tubod',
    sightings: [
      { witness: { name: 'Carla Dumapias', contact: '0917-880-3311' }, dateTime: '2026-05-16 18:20', description: 'Seen waiting for a jeepney near Suarez road.', confidence: 'High', status: 'Verified', location: { name: 'Suarez Waiting Shed', address: 'Suarez road', barangay: 'Suarez' }, vehicle: { type: 'Jeepney', color: 'Yellow', description: 'Jeepney heading toward city proper' }, cctv: { code: 'CCTV-SUA-008', locationDescription: 'Waiting shed CCTV' } }
    ]
  },

  {
    person: { firstName: 'Althea', lastName: 'Macapagal', age: 22, gender: 'Female', description: 'College student, long black hair, wears eyeglasses', clothing: 'Gray hoodie, black pants, sling bag', lastSeenDate: '2026-05-17 19:10', status: 'Found', urgencyLevel: 'Medium' },
    guardian: { name: 'Marites Macapagal', contact: '0916-444-2222', address: 'Barangay Palao, Iligan City' },
    report: { caseNumber: 'MP-ILG-2026-100003', narrative: 'Reported missing after failing to arrive home from errands. Later located safely.' },
    location: { name: 'Palao Public Market', address: 'Market area, Palao, Iligan City', barangay: 'Palao' },
    agency: 'Police Station 5 - Poblacion',
    sightings: [
      { witness: { name: 'Mark Angeles', contact: '0908-333-7676' }, dateTime: '2026-05-17 19:30', description: 'Seen boarding a tricycle near the market area.', confidence: 'High', status: 'Verified', location: { name: 'Palao Market Tricycle Lane', address: 'Near public market exit', barangay: 'Palao' }, vehicle: { type: 'Tricycle', color: 'Red', description: 'Red tricycle, no plate captured' }, cctv: { code: 'CCTV-PAL-011', locationDescription: 'Market exit CCTV' } }
    ]
  },

  {
    person: { firstName: 'Kevin', lastName: 'Ocampo', age: 9, gender: 'Male', description: 'Elementary pupil, small build, short hair', clothing: 'Green shirt, khaki shorts, slippers', lastSeenDate: '2026-05-20 10:30', status: 'Active', urgencyLevel: 'Critical' },
    guardian: { name: 'Mylene Ocampo', contact: '0918-202-7781', address: 'Barangay Palao, Iligan City' },
    report: { caseNumber: 'MP-ILG-2026-100007', narrative: 'Child was last seen near the market area while accompanying a relative.' },
    location: { name: 'Palao Market Entrance', address: 'Public market entrance area', barangay: 'Palao' },
    agency: 'Police Station 5 - Poblacion',
    sightings: [
      { witness: { name: 'Rudy Caban', contact: '0995-771-2222' }, dateTime: '2026-05-20 10:45', description: 'Child with similar clothing seen near a fruit stall.', confidence: 'High', status: 'Unverified', location: { name: 'Fruit Stall Area', address: 'Palao Public Market', barangay: 'Palao' }, vehicle: { type: '', color: '', description: '' }, cctv: { code: 'CCTV-PAL-018', locationDescription: 'Market fruit stall CCTV' } }
    ]
  },

  {
    person: { firstName: 'Grace', lastName: 'Villarin', age: 31, gender: 'Female', description: 'Factory worker, medium build, short hair', clothing: 'White polo shirt, denim pants, black sling bag', lastSeenDate: '2026-05-19 21:15', status: 'Active', urgencyLevel: 'High' },
    guardian: { name: 'Paulo Villarin', contact: '0922-300-3310', address: 'Barangay Mahayahay, Iligan City' },
    report: { caseNumber: 'MP-ILG-2026-100008', narrative: 'Last contacted family while commuting from work.' },
    location: { name: 'Mahayahay Road Junction', address: 'Near Mahayahay road junction', barangay: 'Mahayahay' },
    agency: 'Police Station 5 - Poblacion',
    sightings: [
      { witness: { name: 'Janine Sotto', contact: '0906-202-4400' }, dateTime: '2026-05-19 21:40', description: 'Possible sighting near tricycle terminal.', confidence: 'Medium', status: 'Unverified', location: { name: 'Mahayahay Tricycle Terminal', address: 'Mahayahay road', barangay: 'Mahayahay' }, vehicle: { type: 'Tricycle', color: 'Green', description: 'Green tricycle parked near terminal' }, cctv: { code: 'CCTV-MAH-006', locationDescription: 'Terminal CCTV camera' } }
    ]
  },

  {
    person: { firstName: 'Daniel', lastName: 'Cabahug', age: 35, gender: 'Male', description: 'Delivery rider, medium build, has small scar on left eyebrow', clothing: 'Black jacket, jeans, motorcycle helmet', lastSeenDate: '2026-05-18 22:00', status: 'Active', urgencyLevel: 'Medium' },
    guardian: { name: 'Nora Cabahug', contact: '0917-440-9001', address: 'Barangay Poblacion, Iligan City' },
    report: { caseNumber: 'MP-ILG-2026-100009', narrative: 'Failed to return after delivery route near city proper.' },
    location: { name: 'Poblacion Delivery Drop-off Area', address: 'City proper street', barangay: 'Poblacion' },
    agency: 'Police Station 5 - Poblacion',
    sightings: [
      { witness: { name: 'Arnold Perez', contact: '0939-881-4411' }, dateTime: '2026-05-18 22:20', description: 'Delivery rider seen passing near the plaza road.', confidence: 'Medium', status: 'Unverified', location: { name: 'Poblacion Plaza Road', address: 'Near plaza road', barangay: 'Poblacion' }, vehicle: { type: 'Motorcycle', color: 'Red', description: 'Red delivery motorcycle' }, cctv: { code: 'CCTV-POB-003', locationDescription: 'Plaza road CCTV' } }
    ]
  }
];

for (const item of cases) {
  const personId = uuid();
  await runQuery(`
    MATCH (b:Barangay {name:$barangay, city:$city})
    MATCH (a:Agency {name:$agencyName})
    CREATE (p:MissingPerson {
      id:$personId, firstName:$firstName, lastName:$lastName, age:$age, gender:$gender,
      description:$description, clothing:$clothing, photoUrl:'', lastSeenDate:$lastSeenDate,
      status:$status, urgencyLevel:$urgencyLevel, createdAt:datetime(), updatedAt:datetime()
    })
    CREATE (g:Guardian {id:$guardianId, name:$guardianName, contact:$guardianContact, address:$guardianAddress, createdAt:datetime()})
    CREATE (r:Report {
      id:$reportId,
      caseNumber:$caseNumber,
      narrative:$narrative,
      status:'Open',
      reportedAt:datetime(),
      reportedTo:a.name,
      reportedToContact:a.contact,
      reportedToType:a.type,
      reportedToArea:a.area,
      emergencyContact:a.emergencyContact
    })
    CREATE (l:Location {id:$locationId, name:$locationName, address:$locationAddress, city:$city, province:$province})
    CREATE (g)-[:REPORTED {reportedAt:datetime()}]->(p)
    CREATE (p)-[:HAS_REPORT]->(r)
    CREATE (p)-[:LAST_SEEN_AT]->(l)
    CREATE (l)-[:PART_OF]->(b)
    CREATE (a)-[:HANDLES {since:datetime()}]->(r)
  `, {
    personId,
    guardianId: uuid(),
    reportId: uuid(),
    locationId: uuid(),
    city: CITY,
    province: PROVINCE,
    barangay: item.location.barangay,
    agencyName: item.agency,
    ...item.person,
    guardianName: item.guardian.name,
    guardianContact: item.guardian.contact,
    guardianAddress: item.guardian.address,
    caseNumber: item.report.caseNumber,
    narrative: item.report.narrative,
    locationName: item.location.name,
    locationAddress: item.location.address
  });

  for (const s of item.sightings) {
    await runQuery(`
      MATCH (p:MissingPerson {id:$personId})
      MATCH (b:Barangay {name:$barangay, city:$city})
      CREATE (sg:Sighting {id:$sightingId, dateTime:$dateTime, description:$description, confidence:$confidence, status:$status, createdAt:datetime()})
      CREATE (w:Witness {id:$witnessId, name:$witnessName, contact:$witnessContact, createdAt:datetime()})
      CREATE (l:Location {id:$locationId, name:$locationName, address:$locationAddress, city:$city, province:$province})
      CREATE (p)-[:HAS_SIGHTING]->(sg)
      CREATE (w)-[:REPORTED]->(sg)
      CREATE (sg)-[:NEAR]->(l)
      CREATE (l)-[:PART_OF]->(b)
      FOREACH (_ IN CASE WHEN $vehicleDescription <> '' OR $vehicleType <> '' OR $vehicleColor <> '' THEN [1] ELSE [] END |
        CREATE (v:Vehicle {id:$vehicleId, plateNumber:'', type:$vehicleType, color:$vehicleColor, description:$vehicleDescription})
        CREATE (v)-[:SEEN_NEAR]->(sg)
      )
      FOREACH (_ IN CASE WHEN $cctvCode <> '' OR $cctvLocation <> '' THEN [1] ELSE [] END |
        CREATE (c:CCTV {id:$cctvId, code:$cctvCode, locationDescription:$cctvLocation})
        CREATE (c)-[:COVERS]->(l)
      )
    `, {
      personId,
      city: CITY,
      province: PROVINCE,
      barangay: s.location.barangay,
      sightingId: uuid(),
      witnessId: uuid(),
      locationId: uuid(),
      vehicleId: uuid(),
      cctvId: uuid(),
      witnessName: s.witness.name,
      witnessContact: s.witness.contact,
      dateTime: s.dateTime,
      description: s.description,
      confidence: s.confidence,
      status: s.status,
      locationName: s.location.name,
      locationAddress: s.location.address,
      vehicleType: s.vehicle.type,
      vehicleColor: s.vehicle.color,
      vehicleDescription: s.vehicle.description,
      cctvCode: s.cctv.code,
      cctvLocation: s.cctv.locationDescription
    });
  }
}

console.log(`Seed complete for ${CITY}.`);
console.log('Created 44 Iligan barangays, Iligan police stations/hotlines, and demo missing-person cases.');
console.log('Login: admin@bantaymissing.ph / admin123');
await closeDriver();
