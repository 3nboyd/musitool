import Dexie, { Table } from "dexie";
import { SessionState } from "@/types/studio";

export interface SessionRecord {
  id: string;
  name: string;
  updatedAt: number;
  data: SessionState;
}

class MusiToneDb extends Dexie {
  sessions!: Table<SessionRecord, string>;

  constructor() {
    super("musitool_db");
    this.version(1).stores({
      sessions: "id, name, updatedAt",
    });
  }
}

let dbInstance: MusiToneDb | null = null;

function getDb(): MusiToneDb {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser.");
  }

  if (!dbInstance) {
    dbInstance = new MusiToneDb();
  }

  return dbInstance;
}

export async function saveSession(session: SessionState): Promise<void> {
  const db = getDb();
  await db.sessions.put({
    id: session.id,
    name: session.name,
    updatedAt: session.updatedAt,
    data: session,
  });
}

export async function listSessions(): Promise<SessionRecord[]> {
  const db = getDb();
  return db.sessions.orderBy("updatedAt").reverse().toArray();
}

export async function loadSession(id: string): Promise<SessionState | undefined> {
  const db = getDb();
  const record = await db.sessions.get(id);
  return record?.data;
}

export async function deleteSession(id: string): Promise<void> {
  const db = getDb();
  await db.sessions.delete(id);
}
