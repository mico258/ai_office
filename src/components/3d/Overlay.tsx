import type { ComponentProps, RefObject } from 'react';
import { Html } from '@react-three/drei';

export const overlayPortal: { current: HTMLElement | null } = { current: null };

const NO_POINTER_EVENTS = { pointerEvents: 'none' } as const;
const DEFAULT_Z_INDEX: [number, number] = [30, 0];

type OverlayProps = Omit<ComponentProps<typeof Html>, 'portal'>;

export function Overlay({ style, zIndexRange, ...props }: OverlayProps) {
  return (
    <Html
      portal={overlayPortal as RefObject<HTMLElement>}
      zIndexRange={zIndexRange ?? DEFAULT_Z_INDEX}
      style={style ?? NO_POINTER_EVENTS}
      {...props}
    />
  );
}
