import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import bcrypt from "bcryptjs";

const DATA_DIR = join(process.cwd(), "data");
const USERS_FILE = join(DATA_DIR, "users.json");
const SESSIONS_FILE = join(DATA_DIR, "sessions.json");

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  provider: "email" | "kakao";
  createdAt: number;
}

interface Session {
  token: string;
  userId: string;
  expiresAt: number;
}

// --- Users ---
function loadUsers(): User[] {
  ensureDir();
  if (!existsSync(USERS_FILE)) return [];
  try { return JSON.parse(readFileSync(USERS_FILE, "utf-8")); } catch { return []; }
}

function saveUsers(users: User[]) {
  ensureDir();
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export function findUserByEmail(email: string): User | null {
  return loadUsers().find((u) => u.email === email) || null;
}

export function findUserById(id: string): User | null {
  return loadUsers().find((u) => u.id === id) || null;
}

export async function createUser(email: string, name: string, password: string): Promise<User> {
  const users = loadUsers();
  if (users.find((u) => u.email === email)) throw new Error("이미 등록된 이메일입니다");
  const user: User = {
    id: crypto.randomUUID(),
    email,
    name,
    passwordHash: await bcrypt.hash(password, 10),
    provider: "email",
    createdAt: Date.now(),
  };
  users.push(user);
  saveUsers(users);
  return user;
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

// --- Sessions ---
function loadSessions(): Session[] {
  ensureDir();
  if (!existsSync(SESSIONS_FILE)) return [];
  try { return JSON.parse(readFileSync(SESSIONS_FILE, "utf-8")); } catch { return []; }
}

function saveSessions(sessions: Session[]) {
  ensureDir();
  writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

export function createSession(userId: string): string {
  const sessions = loadSessions().filter((s) => s.expiresAt > Date.now());
  const token = crypto.randomUUID();
  sessions.push({ token, userId, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 }); // 7 days
  saveSessions(sessions);
  return token;
}

export function getUserIdFromToken(token: string): string | null {
  const sessions = loadSessions();
  const session = sessions.find((s) => s.token === token && s.expiresAt > Date.now());
  return session?.userId || null;
}

export function deleteSession(token: string) {
  const sessions = loadSessions().filter((s) => s.token !== token);
  saveSessions(sessions);
}

export function getUserFromCookie(cookieHeader: string | null): User | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/session=([^;]+)/);
  if (!match) return null;
  const userId = getUserIdFromToken(match[1]);
  if (!userId) return null;
  return findUserById(userId);
}
