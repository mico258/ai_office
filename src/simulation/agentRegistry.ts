import type { Vec2 } from '../types/agent';

export interface AgentPose {
  x: number;
  z: number;
  rotY: number;
}

const ARRIVAL_EPSILON = 0.35;

const poses = new Map<string, AgentPose>();

export const agentRegistry = {
  set(id: string, x: number, z: number, rotY: number): void {
    const pose = poses.get(id);
    if (pose) {
      pose.x = x;
      pose.z = z;
      pose.rotY = rotY;
    } else {
      poses.set(id, { x, z, rotY });
    }
  },
  get(id: string): AgentPose | undefined {
    return poses.get(id);
  },
  hasArrived(id: string, target: Vec2, epsilon = ARRIVAL_EPSILON): boolean {
    const pose = poses.get(id);
    if (!pose) return true;
    return Math.hypot(pose.x - target[0], pose.z - target[1]) < epsilon;
  },
  clear(): void {
    poses.clear();
  },
};
