# Product Engineering Office

A 3D simulation of a product engineering team. Each AI agent is a team member (Product, Frontend, Backend, Doc Writer, QA). They pick up tasks, walk between rooms, hand work to each other, hit blockers, and hold meetings while you watch. The office itself shows what the team is doing.

Stack: React, TypeScript, Vite, React Three Fiber, drei, Zustand, Tailwind CSS.

## 1. Run the dashboard

Requirements: Node.js 22 or newer (Vite 8 requires 20.19+ or 22.12+).

```bash
npm install
npm run dev
```

Open http://localhost:5173.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm test` | Unit tests (Vitest) |
| `npm run build` | Typecheck and production build into `dist/` |
| `npm run preview` | Serve the production build locally |

### Using the dashboard

- **Left panel:** the team grouped by department. Click a member to fly the camera to them.
- **Right panel:** details for the selected member (status, task, progress, location, recent activity, stats). Click ✕ to close it and return to the overview. Below it is the live activity feed.
- **Top bar:** sprint number, office clock, team counts, sprint progress, high-priority progress, bug progress.
- **3D office:** drag to orbit, scroll to zoom, right-drag to pan, click a character to select it. "Reset camera" returns to the overview.
- **Bottom controls:** Start, Pause, Reset, and speed 1x, 2x, 5x, 10x. Reset reloads the seed team and tasks.
- **Meeting card:** appears over the office while a meeting is running.

## 2. How the team works

Every task has a **pipeline**, a list of stages. Each stage belongs to one role. The agent with that role picks the task up, works on it at their desk, and hands it to the next role.

| Task type | Pipeline (stage → role) |
|---|---|
| FEATURE | Requirements (Product) → Backend → Frontend → QA → Docs (Doc Writer) |
| BUG | Bug fix (Backend) → Retest (QA) |
| REFACTOR | Backend → QA |
| TEST | Test automation (QA) |
| DOCUMENTATION | Docs (Doc Writer) |
| DESIGN | Requirements (Product) → Design (Frontend) |
| DEPLOYMENT | Deploy (Backend) → Smoke test (QA) |

During the simulation:

- A free agent takes the highest-priority waiting task for their role and walks to their desk.
- When a stage finishes, the agent sends a message to the next role and often walks over to hand it off.
- QA can find a bug at the end of a QA stage. The task then gets a Bug fix and Retest stage inserted, and goes back to Backend.
- An agent can become **BLOCKED** partway through a stage. Another role (see `BLOCKERS` in `workflows.ts`) walks over, resolves it, and work resumes.
- Idle agents visit a colleague or go for coffee.
- Standups, refinements, and technical or design discussions pull the relevant agents into the meeting room, then send them back.
- A sprint ends when all of its tasks are done. The next sprint starts with a planning meeting.

## 3. Add an agent

Agents are data. The simulation does not depend on specific names.

### Same role as an existing one (for example a second Backend Engineer)

Edit `src/simulation/mockData.ts` and add an entry to `AGENT_SEEDS`:

```ts
{
  id: 'david',
  name: 'David',
  role: 'BACKEND',
  department: 'ENGINEERING',
  homeArea: 'ENGINEERING',
  stats: { tasksCompleted: 0, prsReviewed: 0, bugsFixed: 0, docsWritten: 0 },
  log: [],
},
```

- `id` must be unique. `role` must be one of the existing roles.
- The desk is allocated automatically from the slots in `DESK_SLOTS` (`src/simulation/layout.ts`). Engineering has 12 slots, the other rooms have 2. Beyond that, desks are reused, so add slots for larger teams.
- Two agents with the same role share the work: each takes the next waiting task.
- Click Reset (or reload) to see the new member.

### A new role (for example DevOps)

1. `src/types/agent.ts`: add the role to `AgentRole`. Add a department to `Department` if needed.
2. `src/types/team.ts`: add the role to `ALL_ROLES`, `ROLE_TITLES` and `ROLE_COLORS`. Add the department to `DEPARTMENT_ORDER` and `DEPARTMENT_LABELS` if you created one.
3. `src/simulation/workflows.ts`: add one or more stages owned by the new role in `STAGES` (and its `StageId` in `src/types/task.ts`). Use the new stages in a pipeline in `TASK_TEMPLATES`. Optionally add `BLOCKERS` and meeting roles in `MEETING_PLANS`.
4. `src/simulation/layout.ts`: if the role needs its own room, add an `AreaId` in `types/agent.ts`, an entry in `AREAS` and `DESK_SLOTS`, and update `laneOf`/`planPath` in `navigation.ts` if the room opens onto a different corridor. Otherwise reuse an existing area.
5. `src/simulation/mockData.ts`: add the agent to `AGENT_SEEDS`.
6. Run `npm test` and `npm run dev`.

## 4. Give agents tasks

There are three ways, depending on what you want.

### a. Automatically, in the simulation

The Product agent creates tasks on a timer until the sprint is full. The templates and title pool live in `TASK_TEMPLATES` (`src/simulation/workflows.ts`). Add titles or whole templates there. Sprint size and timing are in `src/simulation/simulationEngine.ts`.

### b. As starting data

`createSeedTasks()` in `src/simulation/mockData.ts` defines the tasks present at start, including which stage an open task begins at (`stageIndex`). Edit it and click Reset.

### c. From a real system, over WebSocket

All state changes in the app are `TeamEvent`s (`src/types/events.ts`). Set the backend URL:

```bash
cp .env.example .env.local
```

```
VITE_TEAM_WS_URL=ws://localhost:8001/ws
```

When this is set, the local simulation is turned off, the Start/Pause/Reset/speed controls are replaced by a "LIVE FEED" label, and the app only reacts to JSON messages from your server. Each message is `{ "type": ..., "payload": ... }`.

Create a task:

```json
{
  "type": "TASK_CREATED",
  "payload": {
    "createdBy": "alex",
    "task": {
      "id": "T-200",
      "title": "Refund API",
      "type": "FEATURE",
      "status": "TODO",
      "priority": "HIGH",
      "assigneeId": null,
      "progress": 0,
      "sprintId": 42,
      "pipeline": ["REQUIREMENT", "BACKEND", "FRONTEND", "QA", "DOCS"],
      "stageIndex": 0,
      "bugCount": 0,
      "createdAt": "09:00"
    }
  }
}
```

Assign it and start work, then update progress:

```json
{ "type": "TASK_ASSIGNED", "payload": { "taskId": "T-200", "agentId": "alex" } }
{ "type": "AGENT_STATUS_CHANGED", "payload": { "agentId": "alex", "status": "WORKING", "activity": "Writing requirements for Refund API", "currentTaskId": "T-200" } }
{ "type": "TASK_UPDATED", "payload": { "taskId": "T-200", "patch": { "status": "IN_PROGRESS", "progress": 40 } } }
```

Move an agent, send a message between agents, hold a meeting, finish a task:

```json
{ "type": "AGENT_MOVED", "payload": { "agentId": "alex", "area": "MEETING_ROOM", "target": [0, -5.3], "arrived": false } }
{ "type": "AGENT_MESSAGE", "payload": { "fromId": "alex", "toId": "daniel", "text": "New requirement", "kind": "HANDOFF", "taskId": "T-200" } }
{ "type": "MEETING_STARTED", "payload": { "meeting": { "id": "MTG-1", "kind": "STANDUP", "topic": "Daily sync", "participantIds": ["alex", "daniel"], "startedAt": 0 } } }
{ "type": "MEETING_ENDED", "payload": { "meetingId": "MTG-1" } }
{ "type": "TASK_COMPLETED", "payload": { "taskId": "T-200", "agentId": "daniel" } }
```

Notes for a live backend:

- Events are applied by `src/services/eventReducer.ts`. The 3D scene never talks to the backend directly.
- Agents only walk when you send `AGENT_MOVED`. The scene computes the route and animates it. Send `arrived: true` when the agent has reached the target (the simulation does this by watching the 3D position). A live backend should do the same after a suitable delay.
- The initial team and tasks still come from `mockData.ts`. Make your agent ids match the ids you send, or replace the seed data.
- The WebSocket reconnects automatically every 2 seconds. Only the receive side was exercised in tests, and the socket path has not been run against a real server yet.

## 5. Project layout

```
src/
├── components/
│   ├── 3d/            Office scene, agents, desks, camera, labels, message lines
│   └── dashboard/     Top bar, team list, details, feed, controls, meeting card
├── stores/            agentStore, taskStore, simulationStore, uiStore, eventStore
├── simulation/        engine, workflows, layout, navigation, seed data, world setup
├── services/          teamSocket (transport), eventReducer (events to stores)
└── types/             agent, task, team, events
```

Data flow:

```
simulation engine (mock server) ─► teamSocket.send() ─► eventReducer ─► stores ─► dashboard + 3D scene
```

In live mode the engine is replaced by your WebSocket server, and everything after `teamSocket` stays the same.

## 6. Tests

`npm test` runs navigation, event reducer, and full-simulation tests. The simulation test runs thousands of ticks with a seeded random generator and checks that tasks finish, meetings end, nobody stays blocked forever, and the sprint rolls over.

## 7. Push to GitHub

```bash
git remote add origin git@github.com:<you>/<repo>.git
git push -u origin main
```

`node_modules`, `dist` and `.env.local` are ignored.
