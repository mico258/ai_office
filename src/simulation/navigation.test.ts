import { describe, expect, it } from 'vitest';
import type { Vec2 } from '../types/agent';
import { AREAS, AREA_IDS, BREAK_SPOTS, DESK_SLOTS, MEETING_SEATS, visitSpot, wallRuns, type WallRun } from './layout';
import { laneOf, planPath } from './navigation';

function pathLength(from: Vec2, path: Vec2[]): number {
  let length = 0;
  let previous = from;
  for (const point of path) {
    length += Math.hypot(point[0] - previous[0], point[1] - previous[1]);
    previous = point;
  }
  return length;
}

describe('laneOf', () => {
  it('maps rooms to the lane they open onto', () => {
    expect(laneOf(AREAS.PRODUCT_ROOM.center)).toBe('TOP');
    expect(laneOf(AREAS.QA_AREA.center)).toBe('BOTTOM');
    expect(laneOf(AREAS.ENGINEERING.center)).toBe('ANY');
  });
});

describe('planPath', () => {
  it('ends exactly at the destination', () => {
    const from = DESK_SLOTS.PRODUCT_ROOM[0];
    const to = MEETING_SEATS[0];
    const path = planPath(from, to);
    expect(path[path.length - 1]).toEqual(to);
  });

  it('leaves a desk sideways instead of walking through it', () => {
    const from = DESK_SLOTS.ENGINEERING[0];
    const path = planPath(from, MEETING_SEATS[0]);
    expect(path[0][1]).toBe(from[1]);
    expect(path[0][0]).not.toBe(from[0]);
  });

  it('crosses between the top and bottom rows through the central aisle', () => {
    const path = planPath(DESK_SLOTS.PRODUCT_ROOM[0], DESK_SLOTS.QA_AREA[0]);
    expect(path.some((point) => point[0] === 0)).toBe(true);
  });

  it('keeps desk-to-desk walks inside engineering short and finite', () => {
    const from = DESK_SLOTS.ENGINEERING[0];
    const to = DESK_SLOTS.ENGINEERING[1];
    const path = planPath(from, to);
    expect(path[path.length - 1]).toEqual(to);
    expect(pathLength(from, path)).toBeLessThan(40);
  });

  it('returns no waypoints that repeat consecutively', () => {
    const path = planPath(DESK_SLOTS.DOCS_ROOM[1], DESK_SLOTS.ENGINEERING[2]);
    path.forEach((point, index) => {
      if (index === 0) return;
      const previous = path[index - 1];
      expect(Math.hypot(point[0] - previous[0], point[1] - previous[1])).toBeGreaterThan(0.05);
    });
  });
});

function orientation(a: Vec2, b: Vec2, c: Vec2): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function crosses(a: Vec2, b: Vec2, wall: WallRun): boolean {
  const o1 = orientation(a, b, wall.from);
  const o2 = orientation(a, b, wall.to);
  const o3 = orientation(wall.from, wall.to, a);
  const o4 = orientation(wall.from, wall.to, b);
  return o1 * o2 < -1e-9 && o3 * o4 < -1e-9;
}

describe('walls and doors', () => {
  const walls = AREA_IDS.flatMap((id) => wallRuns(AREAS[id]));
  const destinations: Vec2[] = [
    ...AREA_IDS.flatMap((id) => DESK_SLOTS[id]),
    ...MEETING_SEATS,
    ...BREAK_SPOTS,
    ...AREA_IDS.flatMap((id) => DESK_SLOTS[id].map((slot) => visitSpot(slot))),
    [-14, -1.75],
    [14, 6.1],
    [0, 2.8],
  ];

  it('detects a straight line through a wall, so the routing test has teeth', () => {
    const seat: Vec2 = [-3.2, -7.8];
    const corridor: Vec2 = [-8, -1.75];
    expect(walls.some((wall) => crosses(seat, corridor, wall))).toBe(true);
    const doorway: Vec2 = [0, -3];
    expect(walls.some((wall) => crosses([0, -5], [0, -1.75], wall))).toBe(false);
    expect(doorway).toBeDefined();
  });

  it('defines walls for every room that has a door', () => {
    AREA_IDS.forEach((id) => {
      const area = AREAS[id];
      if (area.door) expect(wallRuns(area).length).toBeGreaterThanOrEqual(3);
    });
  });

  it('never routes an agent through a wall', () => {
    const violations: string[] = [];
    for (const from of destinations) {
      for (const to of destinations) {
        const path = planPath(from, to);
        let previous: Vec2 = from;
        for (const point of path) {
          if (walls.some((wall) => crosses(previous, point, wall))) {
            violations.push(`${from.join(',')} -> ${to.join(',')} at ${previous.join(',')} -> ${point.join(',')}`);
          }
          previous = point;
        }
        expect(previous).toEqual(path.length > 0 ? to : from);
      }
    }
    expect(violations).toEqual([]);
  });

  it('enters and leaves rooms through the door opening', () => {
    const door = AREAS.MEETING_ROOM.door;
    expect(door).not.toBeNull();
    const path = planPath(MEETING_SEATS[0], [-14, -1.75]);
    expect(path.some((point) => point[0] === door?.x)).toBe(true);
  });
});
