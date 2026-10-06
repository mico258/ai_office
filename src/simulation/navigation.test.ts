import { describe, expect, it } from 'vitest';
import type { Vec2 } from '../types/agent';
import { AREAS, DESK_SLOTS, MEETING_SEATS } from './layout';
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
