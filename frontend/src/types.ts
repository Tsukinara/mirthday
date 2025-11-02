export interface User {
  id: number;
  name: string;
  codename: string;
  role?: string;
  votes?: number;
}

export interface Task {
  id: number;
  type?: string | null;
  status: string;
  code: string;
  prefixText: string;
  contents: string;
  location: string;
  clueContent?: string | null;
}

export interface Objective {
  id: number;
  name: string;
  type: string;
  status: string;
  answer?: string; // Only included when status is "SOLVED"
  piecesFound: number;
  totalPieces: number;
  difficulty: number;
}

export interface Activity {
  id: number;
  type: string;
  message: string;
  playerId?: number | null;
  player?: {
    name: string;
    codename: string;
  } | null;
  createdAt: string;
}

