import type { Vec2 } from '../types/agent';
import {
  AISLE_X,
  AREAS,
  AREA_IDS,
  BOTTOM_LANE_Z,
  ENGINEERING_BOTTOM,
  ENGINEERING_MID_Z,
  ENGINEERING_TOP,
  TOP_LANE_Z,
  areaAt,
  deskGap,
  doorGeometry,
  type AreaDef,
  type Lane,
} from './layout';

const MIN_SEGMENT = 0.05;

export function laneOf(point: Vec2): Lane {
  for (const id of AREA_IDS) {
    const { center, size, lane } = AREAS[id];
    if (
      Math.abs(point[0] - center[0]) <= size[0] / 2 &&
      Math.abs(point[1] - center[1]) <= size[1] / 2
    ) {
      return lane;
    }
  }
  if (point[1] < ENGINEERING_TOP) return 'TOP';
  if (point[1] > ENGINEERING_BOTTOM) return 'BOTTOM';
  return 'ANY';
}

function laneZ(lane: Lane): number {
  return lane === 'BOTTOM' ? BOTTOM_LANE_Z : TOP_LANE_Z;
}

function roomWithDoor(point: Vec2): AreaDef | null {
  const id = areaAt(point);
  if (!id) return null;
  const area = AREAS[id];
  return area.door ? area : null;
}

function insideHub(room: AreaDef): Vec2 {
  const door = doorGeometry(room);
  if (!door) throw new Error(`Area ${room.id} has no door`);
  return [door.x, door.zInside];
}

function toHub(room: AreaDef, point: Vec2): Vec2[] {
  const hub = insideHub(room);
  const gap = deskGap(point);
  if (gap) return [gap, [gap[0], hub[1]], hub];
  return [[point[0], hub[1]], hub];
}

function fromHub(room: AreaDef, point: Vec2): Vec2[] {
  const hub = insideHub(room);
  const gap = deskGap(point);
  if (gap) return [[gap[0], hub[1]], [gap[0], point[1]], point];
  return [[point[0], hub[1]], point];
}

function exitPoints(point: Vec2, lane: number): Vec2[] {
  const room = roomWithDoor(point);
  if (room) {
    const door = doorGeometry(room);
    if (door) return [...toHub(room, point), [door.x, door.z], [door.x, lane]];
  }
  const gap = deskGap(point);
  return gap ? [gap, [gap[0], lane]] : [[point[0], lane]];
}

function entryPoints(point: Vec2, lane: number): Vec2[] {
  const room = roomWithDoor(point);
  if (room) {
    const door = doorGeometry(room);
    if (door) return [[door.x, lane], [door.x, door.z], ...fromHub(room, point)];
  }
  const gap = deskGap(point);
  return gap ? [[gap[0], lane], [gap[0], point[1]], point] : [[point[0], lane], point];
}

function compact(from: Vec2, points: Vec2[]): Vec2[] {
  const result: Vec2[] = [];
  let previous = from;
  for (const point of points) {
    if (Math.hypot(previous[0] - point[0], previous[1] - point[1]) > MIN_SEGMENT) {
      result.push(point);
      previous = point;
    }
  }
  return result;
}

export function planPath(from: Vec2, to: Vec2): Vec2[] {
  const fromRoom = roomWithDoor(from);
  const toRoom = roomWithDoor(to);

  if (fromRoom && fromRoom === toRoom) {
    return compact(from, [...toHub(fromRoom, from), ...fromHub(toRoom, to)]);
  }

  const fromLane = laneOf(from);
  const toLane = laneOf(to);

  if (fromLane === 'ANY' && toLane === 'ANY') {
    const fromGap = deskGap(from);
    const toGap = deskGap(to);
    const points: Vec2[] = [];
    if (fromGap) points.push(fromGap);
    points.push([fromGap ? fromGap[0] : from[0], ENGINEERING_MID_Z]);
    points.push([toGap ? toGap[0] : to[0], ENGINEERING_MID_Z]);
    if (toGap) points.push([toGap[0], to[1]]);
    points.push(to);
    return compact(from, points);
  }

  const startLane = fromLane === 'ANY' ? toLane : fromLane;
  const endLane = toLane === 'ANY' ? fromLane : toLane;
  const startZ = laneZ(startLane);
  const endZ = laneZ(endLane);

  const points: Vec2[] = [...exitPoints(from, startZ)];
  if (startLane !== endLane) {
    points.push([AISLE_X, startZ]);
    points.push([AISLE_X, endZ]);
  }
  points.push(...entryPoints(to, endZ));
  return compact(from, points);
}
