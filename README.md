# BantayMissing PH

A Neo4j-powered **Missing Person and Community Alert Graph System** for Philippine barangays, police desks, LGUs, and community safety groups.

## What this system includes

- Vite + React frontend with clean responsive UI
- Node.js + Express backend
- Neo4j graph database
- Guest public landing page for searching active missing-person alerts
- Separate login/register area for police officers, barangay officials, and system admins
- Role-based user management for system administrators
- Login/register authentication using JWT
- CRUD for missing person cases
- Search/filter by name, clothing, status, urgency, and barangay
- Sighting timeline per case
- Graph network preview showing connected nodes and relationships
- Community alert generator
- Dashboard analytics
- JSON graph backup download

## Graph Model

### Nodes

- `User`
- `MissingPerson`
- `Guardian`
- `Report`
- `Location`
- `Barangay`
- `Agency`
- `Sighting`
- `Witness`
- `Vehicle`
- `CCTV`

### Relationships

- `(Guardian)-[:REPORTED]->(MissingPerson)`
- `(MissingPerson)-[:HAS_REPORT]->(Report)`
- `(MissingPerson)-[:LAST_SEEN_AT]->(Location)`
- `(Location)-[:PART_OF]->(Barangay)`
- `(Agency)-[:HANDLES]->(Report)`
- `(MissingPerson)-[:HAS_SIGHTING]->(Sighting)`
- `(Witness)-[:REPORTED]->(Sighting)`
- `(Sighting)-[:NEAR]->(Location)`
- `(Vehicle)-[:SEEN_NEAR]->(Sighting)`
- `(CCTV)-[:COVERS]->(Location)`

## Why Neo4j fits this project

Missing person cases are naturally connected. One person can be linked to a guardian, report, last-seen location, barangay, sightings, witnesses, vehicles, CCTV cameras, and responding agencies. A relational database can store these in tables, but tracing patterns across many joins becomes harder as the case grows. Neo4j stores the case as a graph, making it easier to visualize links, trace sightings, identify related locations, and generate a community alert from connected data.

## Requirements

- Node.js 20+
- Neo4j Desktop, Neo4j Aura, or local Neo4j server
- npm

## Setup

### 1. Start Neo4j

Create a local database in Neo4j Desktop or use AuraDB.

Default local connection:

```env
bolt://localhost:7687
```

### 2. Backend setup

```bash
cd backend
npm install
copy .env.example .env
```

Edit `.env` and set your Neo4j password:

```env
PORT=5000
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password
NEO4J_DATABASE=neo4j
JWT_SECRET=change_this_secret
FRONTEND_URL=http://localhost:5173
```

Seed the database:

```bash
npm run seed
```

Run backend:

```bash
npm run dev
```

Backend runs at:

```txt
http://localhost:5000
```

### 3. Frontend setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```txt
http://localhost:5173
```

## Default login after seeding

```txt
Email: admin@bantaymissing.ph
Password: admin123
```

## Main pages

- `/` - public guest landing page with active missing-person search
- `/missing/:id` - public guest case details
- `/login` - separate login/register page for police officers, barangay officials, and admins
- `/dashboard` - authenticated dashboard
- `/cases` - authenticated case search and records
- `/cases/new` - create missing person report
- `/cases/:id` - case profile, timeline, network preview, alert generator
- `/users` - system admin user management with role and assignment filters

## Suggested presentation title

**BantayMissing PH: A Neo4j-Based Missing Person and Community Alert Graph System**

## Project Context Paragraph

BantayMissing PH is a Neo4j-powered web application designed to help Philippine barangays, police units, local government offices, and community safety groups manage missing person reports more effectively. Missing person cases involve many connected details, including guardians, reports, last known locations, barangays, witnesses, sightings, vehicles, CCTV references, and responding agencies. In traditional record systems, these details are often stored separately, making it difficult to trace relationships and identify possible movement patterns. This system models every case as a graph, allowing users to search records, add sightings, view connected case networks, generate community alert messages, monitor dashboard statistics, and download JSON backups. The system demonstrates the advantage of Neo4j by showing how connected public safety information can support faster coordination and clearer case analysis compared to table-based or document-based databases.

## Iligan City Context Update

This version is localized for **Iligan City, Lanao del Norte**.

The seed script creates:

- all 44 Iligan City barangays as `Barangay` nodes
- one `City` node for Iligan City
- `PART_OF_CITY` relationships from every barangay to Iligan City
- local public safety agencies such as Iligan City Police Office, CDRRMO, barangay public safety offices, and MSU-IIT Campus Security
- sample missing-person cases in barangays such as Tibanga, Palao, and Tubod
- sample sightings connected to witnesses, CCTV references, vehicles, locations, and barangays

### Reset and seed Iligan data

From the backend folder:

```bash
npm run seed
```

Then open Neo4j Browser and run:

```cypher
MATCH (b:Barangay)-[:PART_OF_CITY]->(c:City {name:'Iligan City'})
RETURN b.name, b.psgcCode, b.urbanRural, b.population2024
ORDER BY b.name;
```

To view the graph:

```cypher
MATCH (p:MissingPerson)-[r*1..3]-(n)
RETURN p, r, n;
```

## Added Bonus Features

This version includes extra graph-focused features for the Iligan City missing person context:

- **Automatic case filtering** on the Cases page, without a Search button.
- **Iligan barangay dropdown filter** instead of manual barangay typing.
- **Duplicate report detection** using name, age, barangay, and guardian contact similarity.
- **Possible movement path** built from the last-seen location plus all sightings.
- **Related cases detection** using shared barangays, sightings, and vehicle information.
- **Sighting verification workflow** with Unverified, Under Review, Verified, and False alarm statuses.
- **Community alert poster generator** with copy and print options.
- **Investigation/case notes** connected to each MissingPerson node.
- **UI toast prompts and confirmation modal** for success, error, info, delete confirmation, copy alert, and save actions.
- **Auto urgency suggestion** in the case form based on age and important description keywords.

### New API endpoints

```txt
GET    /api/cases/:id/duplicates
GET    /api/cases/:id/movement-path
GET    /api/cases/:id/related
GET    /api/cases/:id/notes
POST   /api/cases/:id/notes
PATCH  /api/cases/:id/sightings/:sightingId/status
```

These features strengthen the Neo4j justification because they use connected nodes such as MissingPerson, Sighting, Location, Barangay, Vehicle, Witness, Guardian, Report, and CaseNote.


## Latest Role-Based System Update

This version keeps the existing case, dashboard, backup, graph, sighting, poster, and note features, then adds the requested police-station-centered workflow:

- Guests use `/` as the landing page and can search public active missing-person alerts by name, barangay, urgency, location, clothing, or case number.
- Guests can open `/missing/:id` to view public case details, last-seen information, guardian contact when available, and the police station or agency where the case was reported.
- Police officers and barangay officials use `/login` and can register with their assigned police station or barangay.
- System admins use `/users` to add police staff, barangay officials, or administrators, then filter users by role and assigned station/barangay.
- Password fields now have show/hide eye toggles.
- Delete actions use confirmation modals, while successful saves, updates, backups, registrations, and deletes show toast prompts.
- Extra page/card/bar-chart animations were added without removing the existing UI and features.

### New API endpoints from this update

```txt
GET    /api/cases/public
GET    /api/cases/public/:id
GET    /api/users
POST   /api/users
DELETE /api/users/:id
```
