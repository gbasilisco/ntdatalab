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
  KeeperSkill: string;
  PlaymakerSkill: string;
  ScorerSkill: string;
  PassingSkill: string;
  WingerSkill: string;
  DefenderSkill: string;
  SetPiecesSkill: string;
}

/**
 * Full Hattrick Player structure based on user requirements.
 * Used for detailed "My Players" view.
 */
export interface HattrickPlayer {
  id?: string;
  PlayerID: string;
  FirstName: string;
  NickName: string;
  LastName: string;
  Age: number;
  AgeDays: number;
  TSI: number;
  Salary: number;
  SalaryAbroad: number;
  InjuryLevel: number;
  Cards: number;
  TransferListed: string;
  OwningUserID: string;
  OwningTeamID: string;
  IsAbroad: boolean;
  NativeLeagueID: string;
  OwningLeagueID: string;
  OwningLeagueName: string;
  IsNationalTeam: boolean;
  WasNationalTeam: boolean;
  Agreeability: number;
  Aggressiveness: number;
  Honesty: number;
  Loyalty: number;
  Experience: number;
  Leadership: number;
  Specialty: number;
  SpecialtyName: string;
  PlayerForm: number;
  StaminaSkill: number;
  KeeperSkill: number;
  PlaymakerSkill: number;
  ScorerSkill: number;
  PassingSkill: number;
  WingerSkill: number;
  DefenderSkill: number;
  SetPiecesSkill: number;
  EtalonID: string;
  EtalonName: string;
  Potential: number;
  DiffTraining: number;
  TrainingType: number;
  StaminaTrainingPart: number;
  TrainingName: string;
  TrainingType_Last: number;
  StaminaTrainingPart_Last: number;
  TrainingLevel: number;
  NewTrainingLevel: number;
  TrainingLevel_Last: number;
  TrainerSkill: number;
  TeamTrainerSkill: number;
  TeamTrainerLeadership: number;
  AssistantTrainerLevels: number;
  FormCoachLevels: number;
  MedicLevels: number;
  MatchID: string;
  PositionCode: number;
  PlayerCategoryID: number;
  PlayerCategoryName: string;
  MatchTime: number;
  Rating: number;
  RatingEndOfGame: number;
  Updated: string;
  UpdatedSkills: string;
  OwnerNotes: string;
  LastScoutNote: string;
  NextBirthDay: string;
  TeamName: string;
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