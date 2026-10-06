import { resetWorld } from '../../simulation/world';
import { teamSocket } from '../../services/teamSocket';
import { useSimulationStore } from '../../stores/simulationStore';
import { useUiStore } from '../../stores/uiStore';
import { SPEEDS } from '../../types/team';

const BUTTON =
  'rounded-md px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40';

export function SimulationControls() {
  const running = useSimulationStore((state) => state.running);
  const speed = useSimulationStore((state) => state.speed);
  const { start, pause, setSpeed } = useSimulationStore.getState();
  const resetCamera = useUiStore((state) => state.resetCamera);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-950/85 px-3 py-2 shadow-xl backdrop-blur">
      {teamSocket.isLive ? (
        <span className="px-2 text-xs font-semibold tracking-wider text-emerald-300">LIVE FEED</span>
      ) : (
        <>
          <button type="button" disabled={running} onClick={start} className={`${BUTTON} bg-emerald-600 text-white hover:bg-emerald-500`}>
            ▶ Start
          </button>
          <button type="button" disabled={!running} onClick={pause} className={`${BUTTON} bg-slate-700 text-slate-100 hover:bg-slate-600`}>
            ⏸ Pause
          </button>
          <button type="button" onClick={resetWorld} className={`${BUTTON} bg-slate-700 text-slate-100 hover:bg-slate-600`}>
            ↻ Reset
          </button>
          <span className="mx-1 h-5 w-px bg-slate-700" />
          <span className="text-[10px] uppercase tracking-wider text-slate-400">Speed</span>
          {SPEEDS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSpeed(option)}
              className={`${BUTTON} ${speed === option ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              {option}x
            </button>
          ))}
        </>
      )}
      <span className="mx-1 h-5 w-px bg-slate-700" />
      <button type="button" onClick={resetCamera} className={`${BUTTON} bg-slate-800 text-slate-200 hover:bg-slate-700`}>
        ⌖ Reset camera
      </button>
    </div>
  );
}
