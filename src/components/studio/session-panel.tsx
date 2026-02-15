import { Panel } from "@/components/ui/panel";
import { SessionRecord } from "@/lib/storage/db";
import { formatTimeAgo } from "@/lib/format";

interface SessionPanelProps {
  sessionName: string;
  sessions: SessionRecord[];
  saving: boolean;
  onSessionNameChange: (name: string) => void;
  onSave: () => void;
  onRefresh: () => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
}

export function SessionPanel({
  sessionName,
  sessions,
  saving,
  onSessionNameChange,
  onSave,
  onRefresh,
  onLoad,
  onDelete,
  onExportJson,
  onImportJson,
}: SessionPanelProps) {
  return (
    <Panel title="Session Manager" subtitle="Local save/load via IndexedDB and JSON import/export">
      <label className="block text-sm text-slate-300">
        Session Name
        <input
          type="text"
          value={sessionName}
          onChange={(event) => onSessionNameChange(event.target.value)}
          className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Session"}
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={onExportJson}
          className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200"
        >
          Export JSON
        </button>
        <label className="cursor-pointer rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200">
          Import JSON
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onImportJson(file);
              }
              event.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/80 p-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">Saved Sessions</p>
        {sessions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No saved sessions yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {sessions.map((session) => (
              <li key={session.id} className="rounded border border-slate-800 bg-slate-900/80 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{session.name}</p>
                    <p className="text-xs text-slate-400">{formatTimeAgo(session.updatedAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onLoad(session.id)}
                      className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(session.id)}
                      className="rounded border border-rose-500/60 px-2 py-1 text-xs text-rose-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
