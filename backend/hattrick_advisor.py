import datetime

class HattrickAdvisor:
    """
    Classe Stateless per l'analisi dei giocatori Hattrick.
    Supporta target specifici per U21 e Nazionale Maggiore (NT).
    """

    def __init__(self, data, user_targets=None):
        """
        :param data: JSON payload contenente:
                     - last_update (str)
                     - player_age (float)
                     - player_role (str): goalkeeper, defender, midfielder, winger, forward, wingback
                     - team_target (str): "U21" o "NT" (Default: U21)
                     - role_variant (str): "Normal", "Counter-attack", "PNF", "Technical" (Default: Normal)
                     - current_skills (dict): { "playmaking": 10, ... }
                     - training_type (str)
                     - stamina_share (int)
        :param user_targets: Lista di dizionari con i target utente (opzionale)
        """
        self.data = data
        
        # Normalizzazione input
        self.role = self.data.get("player_role", "").lower()
        self.target_level = self.data.get("team_target", "U21") # Rimosso .upper() per supportare custom case-sensitive
        self.variant = self.data.get("role_variant", "Normal")
        
        # --- DATABASE TARGET (Basato sui tuoi dati) ---
        # Formato: [Minimo, Ideale]
        self.TARGETS = {
            "goalkeeper": {
                "U21": {
                    "Normal": {"goalkeeping": 16, "set pieces": 16, "defending": 5}
                },
                "NT": {
                    "Normal": {"goalkeeping": 20, "defending": 14, "set pieces": 20}
                }
            },
            "defender": {
                "U21": {
                    "Normal": {"defending": 14, "playmaking": 10, "passing": 7}
                },
                "NT": {
                    "Normal": {"defending": 18, "playmaking": 16.5, "passing": 9},
                    "Counter-attack": {"defending": 18.5, "playmaking": 15, "passing": 10}
                }
            },
            "midfielder": {
                "U21": {
                    "Normal": {"playmaking": 16, "passing": 7, "defending": 6}
                },
                "NT": {
                    "Normal": {"playmaking": 18.5, "passing": 13, "defending": 10, "scoring": 7}
                }
            },
            "forward": {
                "U21": {
                    "Normal": {"scoring": 14, "passing": 7, "winger": 7, "playmaking": 7},
                    "PNF":    {"scoring": 14, "playmaking": 10, "passing": 7} # Corretto 17->7 per coerenza
                },
                "NT": {
                    "Normal": {"scoring": 18, "passing": 12, "winger": 10, "playmaking": 12},
                    "PNF":    {"scoring": 18, "playmaking": 15, "passing": 10}
                }
            },
            "winger": {
                "U21": {
                    "Normal": {"playmaking": 12, "winger": 14, "defending": 6, "passing": 7}
                },
                "NT": {
                    "Normal": {"playmaking": 18, "winger": 18, "defending": 8, "passing": 9}
                }
            },
            "wingback": {
                "U21": {
                    "Normal": {"defending": 13, "winger": 7, "passing": 6, "playmaking": 6}
                },
                "NT": {
                    "Normal": {"defending": 18, "winger": 16, "passing": 9, "playmaking": 8},
                    "Counter-attack": {"defending": 18, "winger": 16, "passing": 10, "playmaking": 7}
                }
            }
        }

        # Merge User Targets
        if user_targets:
            self.merge_user_targets(user_targets)

    def merge_user_targets(self, user_targets):
        """
        Unisce i target utente a quelli di default.
        Struttura user_target attesa:
        {
            "role": "midfielder",
            "name": "MyU21",
            "variant": "Normal",
            "stats": { ... }
        }
        """
        for t in user_targets:
            role = t.get('role', '').lower()
            name = t.get('name', 'Custom')
            variant = t.get('variant', 'Normal')
            stats = t.get('stats', {})

            if role not in self.TARGETS:
                self.TARGETS[role] = {}
            
            if name not in self.TARGETS[role]:
                self.TARGETS[role][name] = {}
            
            # Sovrascrittura o aggiunta variante
            self.TARGETS[role][name][variant] = stats

    # ---------------------------------------------------------
    # 1. UPDATE CHECK
    # ---------------------------------------------------------
    def check_data_freshness(self):
        last_update_str = self.data.get("last_update")
        if not last_update_str:
            return {"status": "ERROR", "message": "Data mancante"}

        try:
            # Gestione formati multipli (con o senza orario)
            if "T" in last_update_str:
                last_update = datetime.datetime.strptime(last_update_str, "%Y-%m-%dT%H:%M:%S")
            else:
                last_update = datetime.datetime.strptime(last_update_str, "%Y-%m-%d")
            
            diff = datetime.datetime.now() - last_update
            
            if diff.days <= 3:
                return {"status": "OK", "days_ago": diff.days, "timestamp": last_update_str}
            else:
                return {"status": "KO", "days_ago": diff.days, "message": "Dati vecchi (>3gg)"}
        except ValueError:
            return {"status": "ERROR", "message": "Formato data invalido"}

    # ---------------------------------------------------------
    # 2. TRAJECTORY CHECK (Stub)
    # ---------------------------------------------------------
    def check_training_trajectory(self):
        return {
            "status": "STUB",
            "message": "Analisi predittiva non ancora attiva."
        }

    # ---------------------------------------------------------
    # 3. TRAINING COMPATIBILITY
    # ---------------------------------------------------------
    def check_training_compatibility(self):
        training = self.data.get("training_type", "").lower()
        role = self.role
        
        # Mappa semplificata
        valid_map = {
            "goalkeeper": ["goalkeeping", "set pieces", "defending"],
            "defender": ["defending", "set pieces", "playmaking"],
            "midfielder": ["playmaking", "passing", "defending", "set pieces"],
            "winger": ["winger", "playmaking", "passing", "defending"],
            "wingback": ["defending", "winger", "passing"], # Aggiunto Wingback
            "forward": ["scoring", "passing", "winger", "set pieces"]
        }
        
        allowed = valid_map.get(role, [])
        if not allowed:
            return {"status": "WARNING", "message": f"Ruolo '{role}' sconosciuto"}
            
        if training in allowed:
            return {"status": "OK", "role": role, "training": training}
        else:
            return {"status": "KO", "message": f"Allenamento '{training}' insolito per {role}. Consigliati: {allowed}"}

    # ---------------------------------------------------------
    # 4. TARGET CHECK (Logica aggiornata con i tuoi dati)
    # ---------------------------------------------------------
    def check_role_targets(self):
        # 1. Recupera la configurazione corretta
        try:
            role_config = self.TARGETS.get(self.role, {})
            level_config = role_config.get(self.target_level, {})
            
            # Se la variante specificata non esiste (es. "Technical"), fallback su "Normal"
            target_skills = level_config.get(self.variant)
            if not target_skills:
                target_skills = level_config.get("Normal")
                used_variant = "Normal (Fallback)"
            else:
                used_variant = self.variant

        except Exception as e:
            return {"status": "ERROR", "message": f"Errore config target: {str(e)}"}

        if not target_skills:
            return {
                "status": "INFO", 
                "message": f"Nessun target configurato per {self.role} -> {self.target_level}"
            }

        # 2. Confronto Skills
        current_skills = self.data.get("current_skills", {})
        results = []
        missing_skills = []
        is_completed = True
        
        # Normalizzazione nomi skill (input vs db)
        # Il DB usa "defending", "winger". Assicuriamoci che l'input sia allineato.
        
        for skill_name, target_val in target_skills.items():
            # Gestione skill non presente nell'input
            curr_val = current_skills.get(skill_name, 0)
            
            # Calcolo percentuale completamento
            pct = min(100, int((curr_val / target_val) * 100))
            
            if curr_val >= target_val:
                status_icon = "✅"
            else:
                status_icon = "❌"
                is_completed = False
                diff = round(target_val - curr_val, 1)
                missing_skills.append(f"{skill_name} (-{diff})")

            results.append({
                "skill": skill_name,
                "current": curr_val,
                "target": target_val,
                "status": "OK" if curr_val >= target_val else "MISSING",
                "pct": pct
            })

        summary_status = "COMPLETED" if is_completed else "IN_PROGRESS"
        
        return {
            "status": summary_status,
            "role_analyzed": f"{self.role.capitalize()} {self.target_level} ({used_variant})",
            "details": results,
            "missing_summary": missing_skills
        }

    # ---------------------------------------------------------
    # 5. STAMINA CHECK
    # ---------------------------------------------------------
    def check_stamina_setup(self):
        age = self.data.get("player_age", 17.0)
        share = self.data.get("stamina_share", 15)
        
        status = "OK"
        msg = "Bilanciamento corretto."
        
        # Logica U21 vs NT
        if self.target_level == "U21" and age < 21:
            if share > 15:
                status = "WARNING"
                msg = "Per U21 tieni la resistenza bassa (10-12%) per massimizzare le skill."
        elif age >= 28:
             if share < 25:
                status = "WARNING"
                msg = "Giocatore anziano, alza resistenza (>25%) o calerà durante il match."
        
        return {"status": status, "current": share, "message": msg}

    # --- MAIN ENTRY POINT ---
    def run_full_analysis(self):
        return {
            "1_freshness": self.check_data_freshness(),
            "2_trajectory": self.check_training_trajectory(),
            "3_compatibility": self.check_training_compatibility(),
            "4_role_targets": self.check_role_targets(),
            "5_stamina": self.check_stamina_setup()
        }