import firebase_admin
from firebase_admin import credentials, firestore

# Inizializza l'app Firebase solo se non è già stata inizializzata
if not firebase_admin._apps:
    # Su Cloud Run/Functions, le credenziali di default (Service Account) vengono rilevate automaticamente
    firebase_admin.initialize_app()

db = firestore.client()

class TargetManager:
    def __init__(self):
        self.collection_name = 'user_targets'

    def get_user_targets(self, email):
        """Recupera tutti i target salvati per un determinato utente (email)."""
        if not email:
            raise ValueError("Email utente mancante.")
        
        # Query: where email == user_email
        docs = db.collection(self.collection_name).where('user_email', '==', email).stream()
        
        targets = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            targets.append(data)
        
        return targets

    def save_target(self, email, target_data):
        """Salva (crea o sovrascrive) un target."""
        if not email:
            raise ValueError("Email utente mancante.")
        if not target_data:
            raise ValueError("Dati target mancanti.")

        # Aggiungiamo l'email ai dati salvati per poter filtrare
        target_data['user_email'] = email
        
        # Se c'è un ID, facciamo update/set specifico, altrimenti add (nuovo doc)
        target_id = target_data.get('id')
        
        if target_id:
            # Update esistente
            doc_ref = db.collection(self.collection_name).document(target_id)
            doc_ref.set(target_data, merge=True)
            return {"id": target_id, "status": "updated"}
        else:
            # Creazione nuovo
            update_time, doc_ref = db.collection(self.collection_name).add(target_data)
            return {"id": doc_ref.id, "status": "created"}

    def delete_target(self, email, target_id):
        """Elimina un target specifico, verificando che appartenga all'utente."""
        if not email or not target_id:
            raise ValueError("Parametri mancanti per cancellazione.")

        doc_ref = db.collection(self.collection_name).document(target_id)
        snapshot = doc_ref.get()

        if not snapshot.exists:
            return {"status": "not_found"}

        data = snapshot.to_dict()
        if data.get('user_email') != email:
            raise PermissionError("Non puoi cancellare un target non tuo.")

        doc_ref.delete()
        return {"status": "deleted", "id": target_id}

class TeamManager:
    def __init__(self):
        self.collection_name = 'teams'

    def create_team(self, name, type, owner_email):
        """
        Crea un nuovo team.
        ID = {type}_{name} (es. U21_Italia) per garantire unicità globale.
        """
        if not name or not type:
            raise ValueError("Nome e Tipo team obbligatori.")
        
        team_id = f"{type}_{name}"
        doc_ref = db.collection(self.collection_name).document(team_id)
        
        snapshot = doc_ref.get()
        if snapshot.exists:
            # Se esiste, controlliamo se l'owner è lo stesso
            data = snapshot.to_dict()
            if data.get('owner') == owner_email:
                return {"status": "exists_owned", "team_id": team_id}
            else:
                raise ValueError(f"Il team {type} {name} esiste già ed è di un altro coach.")
        
        # Crea nuovo
        data = {
            'name': name,
            'type': type,
            'owner': owner_email,
            'created_at': firestore.SERVER_TIMESTAMP
        }
        doc_ref.set(data)
        return {"status": "created", "team_id": team_id}

    def get_coach_teams(self, coach_email):
        """Ritorna i team creati da un coach."""
        docs = db.collection(self.collection_name).where('owner', '==', coach_email).stream()
        teams = []
        for doc in docs:
            t = doc.to_dict()
            t['id'] = doc.id
            teams.append(t)
        return teams

class RoleManager:
    def __init__(self):
        self.collection_name = 'users'
        self.team_manager = TeamManager()

    def get_role_data(self, email):
        """Recupera l'intero documento utente (ruolo, coach_email, team_name, team_type)."""
        if not email:
            return None
        
        docs = db.collection(self.collection_name).where('email', '==', email).limit(1).stream()
        for doc in docs:
            return doc.to_dict()
        return None

    def get_role(self, email):
        """Recupera solo il ruolo."""
        data = self.get_role_data(email)
        return data.get('role') if data else None

    def set_role(self, requester_email, target_email, new_role, team_name=None, team_type=None):
        """
        Assegna un ruolo ad un utente.
        Se presente team_name e team_type, crea/linka il team.
        """
        if not self._is_coach(requester_email):
            raise PermissionError("Solo un Coach può assegnare ruoli.")
        
        # Gestione Team
        if team_name and team_type:
            # Prova a creare o validare il team
            try:
                self.team_manager.create_team(team_name, team_type, requester_email)
            except ValueError as e:
                return {"error": str(e)}
        
        # Trova o crea il documento per target_email
        docs = db.collection(self.collection_name).where('email', '==', target_email).limit(1).stream()
        target_doc_ref = None
        for doc in docs:
            target_doc_ref = doc.reference
        
        data = {
            'email': target_email,
            'role': new_role,
            'coach_email': requester_email
        }
        if team_name:
            data['team_name'] = team_name
        if team_type:
            data['team_type'] = team_type

        if target_doc_ref:
            target_doc_ref.set(data, merge=True)
        else:
            db.collection(self.collection_name).add(data)
        
        return {"status": "success", "email": target_email, "role": new_role, "coach": requester_email}
    
    def get_all_users(self, requester_email):
        """
        Ritorna gli utenti gestiti da questo coach.
        """
        if not self._is_coach(requester_email):
            raise PermissionError("Accesso negato.")
        
        docs = db.collection(self.collection_name).where('coach_email', '==', requester_email).stream()
        users = []
        for doc in docs:
            u = doc.to_dict()
            u['id'] = doc.id
            users.append(u)
        return users

    def _is_coach(self, email):
        role = self.get_role(email)
        return role == 'coach'


class ListManager:
    def __init__(self):
        self.lists_coll = 'lists'
        self.players_coll = 'players'
        self.role_manager = RoleManager()
    
    def _get_team_id(self, email):
        """
        Determina l'ID del team (che è l'email del Coach).
        - Se utente è Coach -> team_id = email
        - Se utente è Assistant/Scout -> team_id = coach_email
        - Altrimenti -> None (o email stessa se vogliamo fallback privati)
        """
        user_data = self.role_manager.get_role_data(email)
        if not user_data:
            return email # Fallback: se non ha ruolo, vede solo le sue cose private (o nulla)
        
        role = user_data.get('role')
        if role == 'coach':
            return email
        elif role in ['assistant', 'scout']:
            return user_data.get('coach_email')
        
        return email # Default fallback

    def get_lists(self, user_email):
        """Ritorna tutte le liste visibili al team dell'utente."""
        team_id = self._get_team_id(user_email)
        if not team_id:
            return []

        # Query lists by team_id
        docs = db.collection(self.lists_coll).where('team_id', '==', team_id).stream()
        lists = []
        for doc in docs:
            l = doc.to_dict()
            l['id'] = doc.id
            lists.append(l)
        return lists

    def create_list(self, user_email, name):
        """Crea una nuova lista associata al team."""
        if not name:
            raise ValueError("Nome lista obbligatorio")
        
        team_id = self._get_team_id(user_email)
        
        data = {
            'name': name,
            'owner': user_email,       # Chi l'ha creata fisicamente
            'team_id': team_id,        # Il team a cui appartiene (chiave di visibilità)
            'created_at': firestore.SERVER_TIMESTAMP
        }
        update_time, doc_ref = db.collection(self.lists_coll).add(data)
        return {"id": doc_ref.id, "status": "created", "team_id": team_id}

    def delete_list(self, user_email, list_id):
        """Elimina una lista se appartiene al team dell'utente."""
        team_id = self._get_team_id(user_email)
        
        doc_ref = db.collection(self.lists_coll).document(list_id)
        snapshot = doc_ref.get()
        
        if not snapshot.exists:
            return {"status": "not_found"}
            
        data = snapshot.to_dict()
        if data.get('team_id') != team_id:
             raise PermissionError("Non puoi cancellare liste di un altro team.")

        doc_ref.delete()
        
        # Opzionale: rimuovere ID lista dai giocatori batch
        return {"id": list_id, "status": "deleted"}

    def add_player(self, list_id, player_id):
        """Aggiunge un ID giocatore ad una lista."""
        # Qui potremmo controllare se la lista è accessibile, ma per brevità lasciamo
        # che sia la UI a limitare o fidiamoci del list_id valido.
        player_ref = db.collection(self.players_coll).document(str(player_id))
        
        player_ref.set({
            'list_ids': firestore.ArrayUnion([list_id])
        }, merge=True)
        
        return {"status": "added"}
    
    def remove_player(self, list_id, player_id):
        """Rimuove un ID giocatore da una lista."""
        player_ref = db.collection(self.players_coll).document(str(player_id))
        
        player_ref.update({
            'list_ids': firestore.ArrayRemove([list_id])
        })
        
        return {"status": "removed"}
    
    def get_list_players(self, list_id):
        """Trova tutti i giocatori che appartengono a questa lista."""
        docs = db.collection(self.players_coll).where('list_ids', 'array_contains', list_id).stream()
        players = []
        for doc in docs:
            p = doc.to_dict()
            p['player_id'] = doc.id
            if 'owningUserID' in p:
                # Add owning user info if stored in player collection
                 pass
            players.append(p)
        return players
