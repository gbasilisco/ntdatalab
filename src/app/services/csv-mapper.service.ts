import { Injectable } from '@angular/core';
import { HattrickCsvRow, GoogleFunctionPayload } from '../models/hattrick.model';

@Injectable({
  providedIn: 'root'
})
export class CsvMapperService {

  constructor() { }

  /**
   * Mappa una riga del CSV nel payload JSON per la Google Function.
   * * @param row La riga grezza del CSV
   * @param userTarget Il target scelto (U21 o NT)
   * @param userVariant La variante tattica (Normal, PNF, Counter-attack)
   * @param userRole Il ruolo FORZATO dall'utente (es. 'midfielder')
   */
  mapRowToPayload(
    row: HattrickCsvRow, 
    userTarget: string, 
    userVariant: string,
    userRole: string 
  ): GoogleFunctionPayload | null {
    
    // Se non c'è ID, è una riga vuota o invalida
    if (!row.PlayerID) return null;

    return {
      last_update: this.formatDate(row.Updated),
      player_age: this.calculateAge(row.Age, row.AgeDays),
      
      // Qui usiamo il ruolo deciso dall'utente, ignorando la categoria del CSV
      player_role: userRole,
      
      team_target: userTarget,
      role_variant: userVariant,
      
      // Mappiamo l'allenamento (gestisce ita/eng)
      training_type: this.mapTrainingType(row.TrainingName),
      
      // Parsiamo la stamina (default 15 se vuota/errore)
      stamina_share: parseInt(row.StaminaTrainingPart, 10) || 15,
      
      current_skills: {
        goalkeeping: parseInt(row.KeeperSkill, 10) || 0,
        playmaking: parseInt(row.PlaymakerSkill, 10) || 0,
        scoring: parseInt(row.ScorerSkill, 10) || 0,
        passing: parseInt(row.PassingSkill, 10) || 0,
        winger: parseInt(row.WingerSkill, 10) || 0,
        defending: parseInt(row.DefenderSkill, 10) || 0,
        "set pieces": parseInt(row.SetPiecesSkill, 10) || 0
      }
    };
  }

  // --- HELPER PRIVATI ---

  private calculateAge(age: string, days: string): number {
    const y = parseInt(age, 10) || 17;
    const d = parseInt(days, 10) || 0;
    // Calcolo preciso: Anni + (Giorni / 112)
    return parseFloat((y + (d / 112.0)).toFixed(2));
  }

// --- FORMATO DATA SPECIFICO PER: 22/12/2025 06:52:51 ---
  private formatDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString().split('.')[0]; 

    const cleanStr = dateStr.trim();

    // 1. Regex precisa per "DD/MM/YYYY HH:MM:SS"
    // Cattura: Giorno(1) / Mese(2) / Anno(3) Spazio Ora(4) : Min(5) : Sec(6)
    const specificRegex = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/;
    const match = cleanStr.match(specificRegex);

    if (match) {
      const day = match[1];
      const month = match[2];
      const year = match[3];
      const hour = match[4];
      const min = match[5];
      const sec = match[6];

      // Ricostruisce per Python: "2025-12-22T06:52:51"
      return `${year}-${month}-${day}T${hour}:${min}:${sec}`;
    }

    // 2. Fallback per date senza orario "22/12/2025"
    const simpleDateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const simpleMatch = cleanStr.match(simpleDateRegex);
    if (simpleMatch) {
       return `${simpleMatch[3]}-${simpleMatch[2]}-${simpleMatch[1]}T00:00:00`;
    }

    // 3. Se è già ISO (dal DB o altro export)
    if (/^\d{4}-\d{2}-\d{2}/.test(cleanStr)) {
        return cleanStr.replace(' ', 'T');
    }

    console.warn("Formato data non riconosciuto, uso data odierna:", cleanStr);
    return new Date().toISOString().split('.')[0];
  }

  private parseNumber(value: any): number {
    if (value === undefined || value === null || value === '') return 0;
    const stringVal = String(value).replace(',', '.');
    const parsed = parseFloat(stringVal);
    return isNaN(parsed) ? 0 : parsed;
  }

  private mapTrainingType(type: string): string {
    const t = (type || '').toLowerCase();
    // console.log("TARINGIGN: " + t);
    
    // Mappatura Allenamenti (Italiano e Inglese) -> Chiavi Python
    if (t.includes('parat') || t.includes('goalk') || t.includes('goaltendin')) return 'goalkeeping';
    if (t.includes('difes') || t.includes('defen')) return 'defending';
    if (t.includes('regia') || t.includes('playma')) return 'playmaking';
    if (t.includes('cross') || t.includes('winger')) return 'winger';
    if (t.includes('passag') || t.includes('passing')) return 'passing';
    if (t.includes('short passe')) return 'passing';
    if (t.includes('attac') || t.includes('scoring')) return 'scoring';
    if (t.includes('piazzat') || t.includes('setpi') || t.includes('set pieces')) return 'set pieces';
    
    return 'unknown';
  }
}