import { useEffect } from 'react';
import { ActivityFeed } from './components/dashboard/ActivityFeed';
import { AgentDetails } from './components/dashboard/AgentDetails';
import { MeetingCard } from './components/dashboard/MeetingCard';
import { SimulationControls } from './components/dashboard/SimulationControls';
import { TeamSidebar } from './components/dashboard/TeamSidebar';
import { TopBar } from './components/dashboard/TopBar';
import { OfficeWorld } from './components/3d/OfficeWorld';
import { connectWorld } from './simulation/world';
import { useUiStore } from './stores/uiStore';

export default function App() {
  const selectedAgentId = useUiStore((state) => state.selectedAgentId);

  useEffect(() => connectWorld(), []);

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-200">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <TeamSidebar />
        <main className="relative min-w-0 flex-1 overflow-hidden">
          <OfficeWorld />
          <div className="pointer-events-none absolute left-4 top-4">
            <div className="pointer-events-auto">
              <MeetingCard />
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
            <div className="pointer-events-auto">
              <SimulationControls />
            </div>
          </div>
        </main>
        <aside className="flex w-72 shrink-0 flex-col border-l border-slate-800 bg-slate-950 xl:w-80">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {selectedAgentId ? (
              <AgentDetails id={selectedAgentId} />
            ) : (
              <div className="p-6 text-sm text-slate-500">
                Select a team member from the list or click a character in the office to see what they are working on.
              </div>
            )}
          </div>
          <ActivityFeed />
        </aside>
      </div>
    </div>
  );
}
