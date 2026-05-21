# BantayMissing PH

A Neo4j-powered **Missing Person and Community Alert Graph System** for Philippine barangays, police stations, LGUs, and community safety groups. This version is localized for **Iligan City, Lanao del Norte** and supports public guest search, authenticated case management, role-based access, dashboard analytics, graph-based case connections, community alert generation, and backup/export features.

## Project Overview

BantayMissing PH helps public safety offices manage missing person reports by connecting every case to guardians, reports, locations, barangays, police stations, sightings, witnesses, vehicles, CCTV references, notes, and related cases. Instead of treating records as isolated forms, the system uses a graph database so users can see how people, places, reports, and evidence are connected.

The system has two main sides:

1. **Guest/public side** - visitors can search active missing person alerts and view public case information.
2. **Authenticated staff side** - police officers, barangay officials, and system administrators can manage cases based on their assigned role and area.

## Tech Stack

- **Frontend:** Vite + React
- **Backend:** Node.js + Express
- **Database:** Neo4j graph database
- **Authentication:** JWT-based login
- **Password security:** bcrypt password hashing
- **UI tools:** lucide-react icons, toast notifications, confirmation modals, responsive CSS
- **Export/print:** public alert poster generation, image download, print poster, JSON graph backup

## Core Features

### Public Guest Features

- Public landing page for active missing person alerts.
- Search by name, clothing, location, barangay, urgency, or case number.
- Filter alerts by barangay and urgency.
- Sort public alerts by newest, name, or urgency.
- Responsive public card grid for active missing-person cases.
- Hover animations for public case cards.
- Public case details page at `/missing/:id`.
- Public details show last-seen information, clothing, description, status, urgency, case number, guardian contact when available, and assigned police station.
- Public alert text can be copied for sharing.
- Clear “where to report a sighting” information for guests.

### Authentication and User Roles

- Separate login/register page for police officers, barangay officials, and administrators.
- JWT authentication.
- Password hashing using bcrypt.
- Password show/hide eye toggle using lucide-react.
- Users register or are assigned based on role:
  - Police Officer
  - Barangay Official
  - Administrator
- System admins can add, edit, delete, and filter users.
- User management supports filtering by name, email, role, and assigned station/barangay.
- Admin can update user information, role, assignment, and password.
- Delete user action uses a confirmation modal.

### Role-Based Access Control

- **Administrator**
  - Can view and manage all users and cases.
  - Can access the user management page.
  - Can download JSON backup.
  - Can view system-wide dashboard analytics.

- **Police Officer**
  - Can only view and manage cases reported to their assigned police station.
  - Dashboard analytics are scoped to their assigned police station.
  - New reports are automatically tied to their assigned station.

- **Barangay Official**
  - Can only view and manage cases from their assigned barangay.
  - Dashboard analytics are scoped to their assigned barangay.
  - New reports are automatically tied to their assigned barangay.

### Case Management

- Full CRUD for missing person cases.
- Add, view, edit, and delete case records.
- Case search by name, clothing, location, barangay, status, urgency, and case number.
- Automatic filtering without a separate search button.
- Barangay dropdown using Iligan City barangays.
- Status options:
  - Active
  - Found
  - Closed
- Urgency options:
  - Critical
  - High
  - Medium
  - Low
- Photo upload with preview.
- Last seen location details.
- Guardian and reporter details.
- Police station/agency assignment with hotline/contact information.
- User-friendly success/error/info toast notifications.
- User-friendly delete confirmation messages.

### Case Details and Graph-Based Investigation Features

- Case profile page with missing person details.
- Connected profile information:
  - Guardian
  - Report
  - Last-seen location
  - Barangay
  - Handling police station/agency
  - Sightings
  - Witnesses
  - Vehicles
  - CCTV references
- Graph connection map showing how the case is connected to people, places, reports, and evidence.
- Sighting timeline per case.
- Add sightings with witness, location, confidence, status, vehicle, and CCTV information.
- Sighting verification workflow:
  - Unverified
  - Under Review
  - Verified
  - False alarm
- Movement path generated from last-seen location and sightings.
- Duplicate report detection.
- Related cases detection using shared barangays, sightings, vehicles, and related information.
- Investigation/case notes connected to each missing person case.
- Tabs for Movement Path, Duplicates, Related Cases, and Case Notes.

### Alert Poster and Sharing Features

- Generate community alert text from connected case data.
- Copy alert text to clipboard.
- Generate a printable missing person poster.
- Save poster as image.
- Print poster as a clean one-page layout.
- Poster includes:
  - Case number
  - Missing person name
  - Age/gender/status
  - Last seen location
  - Clothing/description
  - Guardian contact
  - Police station contact
  - Safety warning

### Dashboard Features

- Role-based dashboard analytics.
- Dashboard scope message showing the active access level.
- Stats for:
  - Total cases
  - Active cases
  - Sightings
- Donut/pie charts for:
  - Cases by barangay
  - Cases by urgency
- Chart legends with count and percentage.
- Tooltip on donut chart hover.
- Urgent active cases list.
- Recent sightings list.
- Animated stat cards and chart transitions.
- Dashboard data is filtered based on the logged-in user’s assigned station or barangay.

### Backup and Export

- JSON graph backup download.
- Backup preserves graph-style connected data.
- Admin sidebar includes backup download access.
- Success prompt after backup download.

### UI/UX Improvements

- Modern responsive interface.
- Sidebar layout for authenticated pages.
- Public guest landing page with improved hero section.
- Card-based case grid.
- Hover animations on public cards and case cards.
- Toast notifications for add, save, update, delete, copy, print, backup, and errors.
- Confirmation modals for destructive actions.
- More readable modal messages for normal users, without technical database wording.
- Improved user management cards and filters.
- Improved case form sections.
- Improved case details layout.
- Improved dashboard cards, charts, and tooltips.
- Favicon/HTML tab logo using the BM logo.

## Main Pages

```txt
/                 Public guest landing page with active missing-person search
/missing/:id      Public guest case details
/login            Login/register page for officers, barangay officials, and admins
/dashboard        Authenticated role-based dashboard
/cases            Authenticated case search and records
/cases/new        Create missing person report
/cases/:id        Case profile, timeline, graph connection map, alert generator
/cases/:id/edit   Edit missing person case
/users            System admin user management
```

## Graph Model

### Nodes

- `User`
- `MissingPerson`
- `Guardian`
- `Report`
- `Location`
- `Barangay`
- `City`
- `Agency`
- `Sighting`
- `Witness`
- `Vehicle`
- `CCTV`
- `CaseNote`

### Relationships

- `(Guardian)-[:REPORTED]->(MissingPerson)`
- `(MissingPerson)-[:HAS_REPORT]->(Report)`
- `(MissingPerson)-[:LAST_SEEN_AT]->(Location)`
- `(Location)-[:PART_OF]->(Barangay)`
- `(Barangay)-[:PART_OF_CITY]->(City)`
- `(Agency)-[:HANDLES]->(Report)`
- `(Agency)-[:COVERS_BARANGAY]->(Barangay)`
- `(MissingPerson)-[:HAS_SIGHTING]->(Sighting)`
- `(Witness)-[:REPORTED]->(Sighting)`
- `(Sighting)-[:NEAR]->(Location)`
- `(Vehicle)-[:SEEN_NEAR]->(Sighting)`
- `(CCTV)-[:COVERS]->(Location)`
- `(MissingPerson)-[:HAS_NOTE]->(CaseNote)`

## Why Neo4j Fits This Project

Missing person cases are naturally connected. One case may involve a guardian, a report, a last-seen location, a barangay, a police station, witnesses, sightings, vehicles, CCTV references, notes, and related cases. A table-based database can store this information, but tracing the relationships can become harder as the number of records grows.

Neo4j stores the data as a graph, making it easier to:

- See how a case is connected to locations, sightings, witnesses, and agencies.
- Trace possible movement paths.
- Detect related cases through shared barangays, vehicles, or sightings.
- Identify possible duplicate reports.
- Generate alerts using connected case information.
- Support public safety coordination between barangays and police stations.

## Iligan City Context

This version is localized for **Iligan City, Lanao del Norte**.

The seed script creates:

- all 44 Iligan City barangays as `Barangay` nodes
- one `City` node for Iligan City
- `PART_OF_CITY` relationships from barangays to Iligan City
- Iligan police stations and local public safety agencies
- police station hotline/contact details
- police station barangay coverage relationships
- sample missing-person cases in multiple barangays
- sample sightings connected to witnesses, vehicles, CCTV references, locations, and barangays
- seeded demo users for admin, police station staff, and barangay officials

## Requirements

- Node.js 20+
- npm
- Neo4j Desktop, Neo4j Aura, or local Neo4j server

## Setup

### 1. Start Neo4j

Create a local database in Neo4j Desktop or use AuraDB.

Default local connection:

```env
bolt://localhost:7687
```

### 2. Backend Setup

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

### 3. Frontend Setup

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

## Demo Login Accounts

Use these after running the seed script.

```txt
Administrator
Email: admin@bantaymissing.ph
Password: admin123
Access: System-wide dashboard, all cases, all users, backup download
```

```txt
Police Station 4 Staff
Email: ps4@bantaymissing.ph
Password: ps4123
Access: Cases reported to Police Station 4 - Tubod
```

```txt
Police Station 5 Staff
Email: ps5@bantaymissing.ph
Password: ps5123
Access: Cases reported to Police Station 5 - Poblacion
```

```txt
Tubod Barangay Official
Email: tubod@bantaymissing.ph
Password: tubod123
Access: Cases from Barangay Tubod
```

```txt
Palao Barangay Official
Email: palao@bantaymissing.ph
Password: palao123
Access: Cases from Barangay Palao
```

## API Endpoints

### Authentication

```txt
POST   /api/auth/login
POST   /api/auth/register
```

### Public Cases

```txt
GET    /api/cases/public
GET    /api/cases/public/:id
```

### Case Management

```txt
GET    /api/cases
POST   /api/cases
GET    /api/cases/:id
PUT    /api/cases/:id
DELETE /api/cases/:id
```

### Case Graph and Investigation Features

```txt
GET    /api/cases/:id/network
GET    /api/cases/:id/duplicates
GET    /api/cases/:id/movement-path
GET    /api/cases/:id/related
GET    /api/cases/:id/notes
POST   /api/cases/:id/notes
```

### Sightings

```txt
GET    /api/cases/:id/sightings
POST   /api/cases/:id/sightings
PATCH  /api/cases/:id/sightings/:sightingId/status
```

### Community Alert

```txt
GET    /api/cases/:id/alert
```

### Dashboard

```txt
GET    /api/dashboard
```

### User Management

```txt
GET    /api/users
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```

### Backup

```txt
GET    /api/backup/download
```

## Useful Neo4j Queries

View Iligan barangays:

```cypher
MATCH (b:Barangay)-[:PART_OF_CITY]->(c:City {name:'Iligan City'})
RETURN b.name, b.psgcCode, b.urbanRural, b.population2024
ORDER BY b.name;
```

View a case graph:

```cypher
MATCH (p:MissingPerson)-[r*1..3]-(n)
RETURN p, r, n;
```

View police station coverage:

```cypher
MATCH (a:Agency)-[:COVERS_BARANGAY]->(b:Barangay)
RETURN a.name AS station, collect(b.name) AS coveredBarangays
ORDER BY station;
```

View users and assignments:

```cypher
MATCH (u:User)
RETURN u.name, u.email, u.role, u.assignment, u.assignmentType
ORDER BY u.role, u.email;
```

## Suggested Presentation Title

**BantayMissing PH: A Neo4j-Based Missing Person and Community Alert Graph System**

## Project Context Paragraph

BantayMissing PH is a Neo4j-powered web application designed to help Philippine barangays, police units, local government offices, and community safety groups manage missing person reports more effectively. Missing person cases involve many connected details, including guardians, reports, last known locations, barangays, witnesses, sightings, vehicles, CCTV references, case notes, and responding agencies. Traditional record systems often store these details separately, making it difficult to trace relationships and identify movement patterns. This system models every case as a graph, allowing users to search records, add sightings, view connected case networks, detect possible duplicates, review related cases, generate community alert messages, monitor role-based dashboard statistics, and download JSON backups. The system demonstrates the advantage of Neo4j by showing how connected public safety information can support faster coordination and clearer case analysis compared to table-based or document-based databases.

## Notes

- Do not upload `.env` files to GitHub.
- Do not upload `node_modules`.
- Run `npm install` separately inside both `backend` and `frontend`.
- Run the seed script before testing demo accounts.
- Police officer and barangay official views depend on correct `role`, `assignment`, and `assignmentType` values.
