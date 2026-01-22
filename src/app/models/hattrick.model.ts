// src/app/models/hattrick.model.ts

export interface HattrickCsvRow {
  PlayerID: string;
  FirstName: string;
  LastName: string;
  NickName: string;
  Age: string;
  AgeDays: string;
  Updated: string;
  PlayerCategoryName: string;
  PositionCode: string;
  TrainingType: string;
  TrainingName: string;
  StaminaTrainingPart: string;
  LastScoutNote: string;
  TransferListed: string;
  TeamTrainerSkill: string;
  OwningUserID: string;
  /* OLD
  SkillKeeper: string;
  SkillPlaymaker: string;
  SkillScorer: string;
  SkillPassing: string;
  SkillWinger: string;
  SkillDefender: string;
  SkillSetPieces: string;
  */

  // --- NOMI COLONNE CORRETTI ---
  KeeperSkill: string;      // Prima era SkillKeeper
  PlaymakerSkill: string;   // Prima era SkillPlaymaker
  ScorerSkill: string;      // Prima era SkillScorer
  PassingSkill: string;     // Prima era SkillPassing
  WingerSkill: string;      // Prima era SkillWinger
  DefenderSkill: string;    // Prima era SkillDefender
  SetPiecesSkill: string;   // Prima era SkillSetPieces

}

// Aggiungi questa interfaccia per il dettaglio skill
export interface SkillDetail {
  skill: string;
  current: number;
  target: number;
  status: string; // "OK" | "MISSING"
  pct: number;
}

export interface GoogleFunctionPayload {
  last_update: string;
  player_age: number;
  player_role: string;
  team_target: string;
  role_variant: string;
  training_type: string;
  stamina_share: number;
  current_skills: {
    goalkeeping: number;
    playmaking: number;
    scoring: number;
    passing: number;
    winger: number;
    defending: number;
    "set pieces": number;
  };
}

// --- QUESTA È L'INTERFACCIA DA AGGIORNARE ---
export interface AnalysisResponse {
  // Aggiungiamo i campi mancanti (1, 2, 3)
  "1_freshness"?: {
    status: string;
    message?: string;
    days_ago?: number;
  };
  "2_trajectory"?: {
    status: string;
    message?: string;
  };
  "3_compatibility"?: {
    status: string;
    message?: string;
    role?: string;
    training?: string;
  };
  "4_role_targets": {
    status: string;
    missing_summary: string[];
    role_analyzed: string;
    details: SkillDetail[];
  };
  "5_stamina": {
    status: string;
    message: string;
  };
}

export interface PlayerResult {
  id: string;
  fullName: string;
  status: 'PENDING' | 'LOADING' | 'SUCCESS' | 'WARNING' | 'ERROR';
  // --- NUOVI CAMPI DA VISUALIZZARE ---
  trainingType?: string;
  stamina?: number;
  lastUpdate?: string; // <--- NUOVO CAMPO
  age?: string;
  ageDays?: string;
  lastScoutNote?: string;
  transferListed?: string;
  teamTrainerSkill?: string;
  owningUserID?: string;
  // -----------------------------------
  analysis?: AnalysisResponse;
  error?: string;
}