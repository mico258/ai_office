import type { AreaId, Vec2 } from '../types/agent';

export type Side = 'N' | 'S' | 'E' | 'W';
export type Lane = 'TOP' | 'BOTTOM' | 'ANY';

export interface DoorDef {
  side: 'N' | 'S';
  x: number;
  width: number;
}

export interface AreaDef {
  id: AreaId;
  label: string;
  center: Vec2;
  size: Vec2;
  color: string;
  lane: Lane;
  walls: Side[];
  door: DoorDef | null;
}

export interface WallRun {
  from: Vec2;
  to: Vec2;
}

export const WORLD = { width: 32, depth: 24 };

export const TOP_LANE_Z = -1.75;
export const BOTTOM_LANE_Z = 6.1;
export const AISLE_X = 0;
export const ENGINEERING_TOP = -0.5;
export const ENGINEERING_BOTTOM = 5.5;
export const ENGINEERING_MID_Z = 2.8;
export const DESK_OFFSET_Z = 0.95;
export const DOOR_WIDTH = 2.4;
export const DOOR_INSET = 0.9;
export const WALL_HEIGHT = 2;

export const AREAS: Record<AreaId, AreaDef> = {
  PRODUCT_ROOM: {
    id: 'PRODUCT_ROOM',
    label: 'Product Room',
    center: [-10, -7],
    size: [10, 8],
    color: '#f59e0b',
    lane: 'TOP',
    walls: ['W', 'E', 'S'],
    door: { side: 'S', x: -10, width: DOOR_WIDTH },
  },
  MEETING_ROOM: {
    id: 'MEETING_ROOM',
    label: 'Meeting Room',
    center: [0, -7],
    size: [8, 8],
    color: '#60a5fa',
    lane: 'TOP',
    walls: ['W', 'E', 'S'],
    door: { side: 'S', x: 0, width: DOOR_WIDTH },
  },
  DOCS_ROOM: {
    id: 'DOCS_ROOM',
    label: 'Documentation Room',
    center: [10, -7],
    size: [10, 8],
    color: '#a78bfa',
    lane: 'TOP',
    walls: ['W', 'E', 'S'],
    door: { side: 'S', x: 10, width: DOOR_WIDTH },
  },
  ENGINEERING: {
    id: 'ENGINEERING',
    label: 'Engineering Area',
    center: [0, 2.5],
    size: [22, 6],
    color: '#34d399',
    lane: 'ANY',
    walls: [],
    door: null,
  },
  QA_AREA: {
    id: 'QA_AREA',
    label: 'QA Area',
    center: [-10, 9],
    size: [10, 5],
    color: '#fb7185',
    lane: 'BOTTOM',
    walls: ['W', 'E', 'N'],
    door: { side: 'N', x: -10, width: DOOR_WIDTH },
  },
  BREAK_AREA: {
    id: 'BREAK_AREA',
    label: 'Coffee / Break Area',
    center: [10, 9],
    size: [10, 5],
    color: '#f472b6',
    lane: 'BOTTOM',
    walls: ['W', 'E', 'N'],
    door: { side: 'N', x: 10, width: DOOR_WIDTH },
  },
};

export const AREA_IDS = Object.keys(AREAS) as AreaId[];

export const DESK_SLOTS: Record<AreaId, Vec2[]> = {
  PRODUCT_ROOM: [
    [-12, -8.8],
    [-8, -8.8],
  ],
  DOCS_ROOM: [
    [8, -8.8],
    [12, -8.8],
  ],
  ENGINEERING: [
    [-6, 0.9],
    [6, 0.9],
    [-9, 0.9],
    [9, 0.9],
    [-3, 0.9],
    [3, 0.9],
    [-6, 3.5],
    [6, 3.5],
    [-9, 3.5],
    [9, 3.5],
    [-3, 3.5],
    [3, 3.5],
  ],
  QA_AREA: [
    [-12, 8],
    [-8, 8],
  ],
  MEETING_ROOM: [],
  BREAK_AREA: [],
};

export const MEETING_TABLE: Vec2 = [0, -7];

export const MEETING_SEATS: Vec2[] = [
  [-2.25, -5.3],
  [-0.75, -5.3],
  [0.75, -5.3],
  [2.25, -5.3],
  [-3.2, -7.8],
  [-3.2, -6.2],
  [3.2, -7.8],
  [3.2, -6.2],
];

export const COFFEE_MACHINE: Vec2 = [14, 10.8];

export const BREAK_SPOTS: Vec2[] = [
  [7.5, 9.2],
  [9, 10.4],
  [11, 10.6],
  [12.6, 9.4],
  [8.5, 7.8],
  [11.5, 7.8],
];

const SAME_SPOT_EPSILON = 0.08;

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function sameSpot(a: Vec2, b: Vec2): boolean {
  return distance(a, b) < SAME_SPOT_EPSILON;
}

export function areaAt(point: Vec2): AreaId | null {
  for (const id of AREA_IDS) {
    const { center, size } = AREAS[id];
    if (
      Math.abs(point[0] - center[0]) <= size[0] / 2 &&
      Math.abs(point[1] - center[1]) <= size[1] / 2
    ) {
      return id;
    }
  }
  return null;
}

export function deskGap(point: Vec2): Vec2 | null {
  for (const id of AREA_IDS) {
    if (DESK_SLOTS[id].some((slot) => sameSpot(slot, point))) {
      const towardCenter = AREAS[id].center[0] - point[0] >= 0 ? 1.5 : -1.5;
      return [point[0] + towardCenter, point[1]];
    }
  }
  return null;
}

export function visitSpot(home: Vec2): Vec2 {
  return deskGap(home) ?? [home[0] + 1.5, home[1]];
}

export function allocateDesk(area: AreaId, used: Map<AreaId, number>): Vec2 {
  const slots = DESK_SLOTS[area];
  const index = used.get(area) ?? 0;
  used.set(area, index + 1);
  return slots[index % slots.length];
}

export interface DoorGeometry {
  x: number;
  z: number;
  zInside: number;
  width: number;
  insideDirection: 1 | -1;
}

export function doorGeometry(area: AreaDef): DoorGeometry | null {
  if (!area.door) return null;
  const [, cz] = area.center;
  const depth = area.size[1];
  const south = area.door.side === 'S';
  const insideDirection = south ? -1 : 1;
  const z = south ? cz + depth / 2 : cz - depth / 2;
  return {
    x: area.door.x,
    z,
    zInside: z + insideDirection * DOOR_INSET,
    width: area.door.width,
    insideDirection,
  };
}

export function wallRuns(area: AreaDef): WallRun[] {
  const [cx, cz] = area.center;
  const [width, depth] = area.size;
  const left = cx - width / 2;
  const right = cx + width / 2;
  const north = cz - depth / 2;
  const south = cz + depth / 2;
  const runs: WallRun[] = [];

  const horizontal = (side: 'N' | 'S', z: number) => {
    if (area.door && area.door.side === side) {
      runs.push({ from: [left, z], to: [area.door.x - area.door.width / 2, z] });
      runs.push({ from: [area.door.x + area.door.width / 2, z], to: [right, z] });
    } else {
      runs.push({ from: [left, z], to: [right, z] });
    }
  };

  if (area.walls.includes('W')) runs.push({ from: [left, north], to: [left, south] });
  if (area.walls.includes('E')) runs.push({ from: [right, north], to: [right, south] });
  if (area.walls.includes('N')) horizontal('N', north);
  if (area.walls.includes('S')) horizontal('S', south);
  return runs;
}
