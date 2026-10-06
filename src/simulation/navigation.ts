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
  deskGap,
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

export function planPath(from: Vec2, to: Vec2): Vec2[] {
  const points: Vec2[] = [];
  const push = (point: Vec2) => {
    const last = points[points.length - 1];
    if (!last || Math.hypot(last[0] - point[0], last[1] - point[1]) > MIN_SEGMENT) {
      points.push(point);
    }
  };

  const fromLane = laneOf(from);
  const toLane = laneOf(to);
  const fromGap = deskGap(from);
  const toGap = deskGap(to);

  if (fromLane === 'ANY' && toLane === 'ANY') {
    push(from);
    if (fromGap) push(fromGap);
    push([fromGap ? fromGap[0] : from[0], ENGINEERING_MID_Z]);
    push([toGap ? toGap[0] : to[0], ENGINEERING_MID_Z]);
    if (toGap) push([toGap[0], to[1]]);
    push(to);
    return points.slice(1);
  }

  const startLane = fromLane === 'ANY' ? toLane : fromLane;
  const endLane = toLane === 'ANY' ? fromLane : toLane;
  const startZ = laneZ(startLane);
  const endZ = laneZ(endLane);

  push(from);
  if (fromGap) push(fromGap);
  push([fromGap ? fromGap[0] : from[0], startZ]);
  if (startLane !== endLane) {
    push([AISLE_X, startZ]);
    push([AISLE_X, endZ]);
  }
  push([toGap ? toGap[0] : to[0], endZ]);
  if (toGap) push([toGap[0], to[1]]);
  push(to);
  return points.slice(1);
}
