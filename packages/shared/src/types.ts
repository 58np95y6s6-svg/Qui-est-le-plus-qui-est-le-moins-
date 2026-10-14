// Types partagés entre le Worker (Durable Object) et l'app web.

export type Mode = "most" | "never" | "quiz";
export type GameMode = Mode | "mix";
export type Theme = "collegues" | "amis" | "famille" | "full" | "trash" | "hot" | "trashhot";
export type Polarity = "positive" | "negative" | "neutral";
export type Difficulty = "easy" | "medium" | "hard";

/* ---------- Banques de questions ---------- */
export interface MostQuestion {
  id: string;
  text: string;
  format: "most" | "least" | "who_for" | "most_likely";
  polarity: Polarity;
  themes: string[];
  intensity: 1 | 2 | 3;
  fullExcluded: boolean;
  adult: boolean;
  verdict: string;
}
export interface NeverQuestion {
  id: string;
  question: string;
  reveal: string;
  polarity: Polarity;
  themes: string[];
  intensity: 1 | 2 | 3;
  aboutRoom: boolean;
  sensitive: boolean;
  adult: boolean;
  fullExcluded: boolean;
}
export interface QuizQuestion {
  id: string;
  category: string;
  difficulty: Difficulty;
  question: string;
  choices: string[];
  answer: number;
  fact: string;
}
export interface Bank {
  most: MostQuestion[];
  never: NeverQuestion[];
  quiz: QuizQuestion[];
}

/* ---------- Réglages ---------- */
export interface Settings {
  mode: GameMode;
  questionCount: number;
  theme: Theme;
  allowAdult: boolean;
  hostPlays: boolean;
  votesPerPlayer: number;
  selfVote: boolean;
  anonymousVotes: boolean;
  challenge: boolean;
  challengesPerPlayer: number;
  skipThreshold: "third" | "half";
  spicy: boolean;
  lateJoin: boolean;
  reveal: "assume" | "faces" | "count";
  guesses: boolean;
  quizCategories: string[];
  quizDifficulty: Difficulty | "progressive";
  quizTimer: number;
  jokers: number;
}

export type RuleKey =
  | "mode" | "questionCount" | "theme" | "votesPerPlayer" | "selfVote" | "anonymousVotes"
  | "challenge" | "skipThreshold" | "spicy" | "reveal" | "guesses" | "quizDifficulty" | "quizTimer";

/* ---------- État d'un salon ---------- */
export interface Player {
  id: string;
  name: string;
  color: number;
  joinedAt: number;
  host: boolean;
  left: boolean;
  connected: boolean;
  awaySince: number | null;
  lastReturnAt: number;
  consent: boolean | null;
  challengesUsed: number;
  nudgedAt: number | null;
}

export interface Item {
  kind: Mode;
  qid: string;
}

export interface MostResult {
  counts: Record<string, number>;
  designated: string[];
  unanimous: boolean;
  voters?: Record<string, string[]>; // cible -> votants (votes publics seulement)
  totalVoters: number;
}
export interface NeverResult {
  count: number;
  total: number;
  revealed: string[]; // visages révélés
  guessPoints: Record<string, number>;
}
export interface QuizResult {
  correct: number; // index d'affichage de la bonne réponse
  picks: Record<string, number>; // joueur -> index d'affichage choisi
  points: Record<string, number>;
  times: Record<string, number>; // ms
}

export interface Round {
  index: number;
  item: Item;
  revote: boolean;
  startedAt: number;
  deadline: number | null; // quiz seulement
  ballots: Record<string, string[]>; // most : votes validés
  answers: Record<string, boolean>; // never : true = « J'ai déjà »
  guesses: Record<string, number>; // never : pronostics
  picks: Record<string, { choice: number; at: number; joker: boolean }>; // quiz
  jokers: Record<string, number[]>; // quiz : index d'affichage éliminés
  order: number[]; // quiz : order[affichage] = index d'origine
  skipRequests: string[];
  revealAt: number | null;
  most?: MostResult;
  firstMost?: MostResult; // résultat avant contestation
  never?: NeverResult;
  quiz?: QuizResult;
  challengedBy: string | null;
  challengeOutcome: "acquitted" | "confirmed" | null;
  assumed: string[];
  story: { playerId: string; endsAt: number } | null;
}

export type PhaseName =
  | "lobby" | "rules" | "consent" | "question" | "countdown" | "reveal" | "defense" | "milestone" | "ceremony";

export interface Phase {
  name: PhaseName;
  endsAt: number | null;
}

export interface Stats {
  pos: number;
  neg: number;
  neutral: number;
  designated: number;
  votesReceived: number;
  aligned: number;
  voted: number;
  challengesWon: number;
  challengesLost: number;
  neverYes: number;
  neverYesWeighted: number;
  guessPoints: number;
  quizScore: number;
  quizCorrect: number;
  quizStreak: number;
  quizBestStreak: number;
  quizFastest: number;
  quizCat: Record<string, [number, number]>;
}

export interface RulesVote {
  keys: RuleKey[];
  ballots: Record<string, Partial<Record<RuleKey, unknown>>>;
}

export interface RoomState {
  code: string;
  createdAt: number;
  lastActivity: number;
  seed: number;
  settings: Settings;
  votable: RuleKey[];
  players: Player[];
  tokens: Record<string, string>; // jamais envoyé aux clients
  phase: Phase;
  rulesVote: RulesVote | null;
  items: Item[];
  played: number; // questions jouées (hors questions passées)
  round: Round | null;
  stats: Record<string, Stats>;
  seen: string[];
  gameNumber: number;
  totalPlayed: number;
  consentEndsAt: number | null;
  adultActive: boolean;
  milestoneDone: boolean;
  roundDurations: number[];
  ceremony: Ceremony | null;
  notice: { text: string; at: number } | null;
}

export interface CeremonyEntry {
  playerId: string;
  value: number;
}
export interface Ceremony {
  sections: { key: string; title: string; subtitle: string; tone: "pos" | "neg" | "neu" | "gold"; podium: CeremonyEntry[]; unit: string }[];
  awards: { title: string; playerId: string | null; detail: string }[];
  groupStats: string[];
}

/* ---------- Vues envoyées aux clients ---------- */
export interface PublicPlayer {
  id: string;
  name: string;
  color: number;
  host: boolean;
  connected: boolean;
  awaySince: number | null;
  plays: boolean;
  challengesUsed: number;
  consent: boolean | null;
}

export interface QuestionView {
  kind: Mode;
  id: string;
  text: string;
  polarity?: Polarity;
  format?: string;
  verdict?: string;
  reveal?: string;
  sensitive?: boolean;
  intensity?: number;
  category?: string;
  difficulty?: Difficulty;
  choices?: string[];
  fact?: string;
}

export interface RoundView {
  index: number;
  number: number; // numéro affiché (1-based)
  total: number;
  revote: boolean;
  deadline: number | null;
  question: QuestionView;
  done: string[]; // qui a validé
  myBallot: string[] | null;
  myAnswer: boolean | null;
  myGuess: number | null;
  myPick: number | null;
  myJoker: number[] | null;
  skipRequests: string[];
  revealAt: number | null;
  most?: MostResult;
  firstMost?: MostResult;
  never?: NeverResult;
  quiz?: QuizResult;
  challengedBy: string | null;
  challengeOutcome: "acquitted" | "confirmed" | null;
  assumed: string[];
  story: { playerId: string; endsAt: number } | null;
  myAnswerWasYes?: boolean;
}

export interface RoomView {
  code: string;
  now: number;
  me: string;
  settings: Settings;
  votable: RuleKey[];
  players: PublicPlayer[];
  phase: Phase;
  rulesVote: { keys: RuleKey[]; done: string[]; mine: Partial<Record<RuleKey, unknown>> | null; tally: Record<string, Record<string, number>> } | null;
  round: RoundView | null;
  played: number;
  total: number;
  remainingMs: number | null;
  results: { kind: Mode; polarity?: Polarity; correct?: boolean }[];
  standings: { playerId: string; score: number; delta: number }[];
  ceremony: Ceremony | null;
  gameNumber: number;
  totalPlayed: number;
  adultActive: boolean;
  notice: { text: string; at: number } | null;
  milestone: { kind: "half"; trends: string[] } | null;
}

/* ---------- Messages ---------- */
export type ClientMessage =
  | { t: "create"; name: string; photo: string | null; settings: Partial<Settings>; votable: RuleKey[] }
  | { t: "join"; name: string; photo: string | null }
  | { t: "rejoin"; playerId: string; token: string }
  | { t: "photo"; data: string }
  | { t: "settings"; settings: Partial<Settings>; votable?: RuleKey[] }
  | { t: "rules:open" }
  | { t: "rules:vote"; ballot: Partial<Record<RuleKey, unknown>> }
  | { t: "rules:close" }
  | { t: "start" }
  | { t: "consent"; yes: boolean }
  | { t: "vote"; targets: string[] }
  | { t: "answer"; yes: boolean }
  | { t: "guess"; value: number }
  | { t: "pick"; choice: number }
  | { t: "joker" }
  | { t: "skip"; on: boolean }
  | { t: "force" }
  | { t: "next" }
  | { t: "hostSkip" }
  | { t: "challenge" }
  | { t: "endDefense" }
  | { t: "assume" }
  | { t: "story" }
  | { t: "kick"; playerId: string }
  | { t: "nudge"; playerId: string }
  | { t: "takeHost" }
  | { t: "leave" }
  | { t: "end" }
  | { t: "replay"; settings?: Partial<Settings> };

export type ServerMessage =
  | { t: "welcome"; playerId: string; token: string; code: string }
  | { t: "state"; view: RoomView }
  | { t: "photo"; playerId: string; data: string }
  | { t: "photo:request" }
  | { t: "error"; code: string; message: string }
  | { t: "nudge"; from: string };
