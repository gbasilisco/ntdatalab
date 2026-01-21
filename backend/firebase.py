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

class RoleManager:
    def __init__(self):
        self.collection_name = 'users'

    def get_role(self, email):
        """Recupera il ruolo di un utente."""
        if not email:
            return None
        
        # In this simplistic model, the doc ID is potentially the email or we query by email field
        # We will use query by email to be consistent with other patterns or use email as ID if we want
        # Let's assume we query by email to avoid encoding issues with chars in email as keys
        docs = db.collection(self.collection_name).where('email', '==', email).limit(1).stream()
        for doc in docs:
            return doc.to_dict().get('role')
        return None

    def set_role(self, requester_email, target_email, new_role):
        """
        Assegna un ruolo ad un utente.
        Solo chi ha ruolo 'coach' può eseguire questa azione.
        """
        if not self._is_coach(requester_email):
            raise PermissionError("Solo un Coach può assegnare ruoli.")
        
        # Trova o crea il documento per target_email
        docs = db.collection(self.collection_name).where('email', '==', target_email).limit(1).stream()
        target_doc_ref = None
        for doc in docs:
            target_doc_ref = doc.reference
        
        data = {
            'email': target_email,
            'role': new_role
        }

        if target_doc_ref:
            target_doc_ref.set(data, merge=True)
        else:
            # Crea nuovo
            db.collection(self.collection_name).add(data)
        
        return {"status": "success", "email": target_email, "role": new_role}
    
    def get_all_users(self, requester_email):
        """Ritorna tutti gli utenti e i loro ruoli (solo per coach)."""
        if not self._is_coach(requester_email):
            raise PermissionError("Accesso negato.")
        
        docs = db.collection(self.collection_name).stream()
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
    
    def get_lists(self):
        """Ritorna tutte le liste disponibili."""
        docs = db.collection(self.lists_coll).stream()
        lists = []
        for doc in docs:
            l = doc.to_dict()
            l['id'] = doc.id
            lists.append(l)
        return lists

    def create_list(self, user_email, name):
        """Crea una nuova lista."""
        if not name:
            raise ValueError("Nome lista obbligatorio")
        
        data = {
            'name': name,
            'owner': user_email,
            'created_at': firestore.SERVER_TIMESTAMP
        }
        update_time, doc_ref = db.collection(self.lists_coll).add(data)
        return {"id": doc_ref.id, "status": "created"}

    def delete_list(self, user_email, list_id):
        """Elimina una lista."""
        # In futuro si potrebbe controllare se user_email == owner o se è coach
        # Per ora: tutti i privilegiati possono farlo
        db.collection(self.lists_coll).document(list_id).delete()
        
        # Opzionale: rimuovere ID lista dai giocatori? 
        # Per semplicità lo saltiamo ora, ma idealmente andrebbe fatto batch
        return {"id": list_id, "status": "deleted"}

    def add_player(self, list_id, player_id):
        """Aggiunge un ID giocatore ad una lista."""
        # Usiamo il documento player per tenere traccia delle liste a cui appartiene
        player_ref = db.collection(self.players_coll).document(str(player_id))
        
        # Atomically add a new region to the 'list_ids' array field.
        player_ref.set({
            'list_ids': firestore.ArrayUnion([list_id])
        }, merge=True)
        
        return {"status": "added"}
    
    def remove_player(self, list_id, player_id):
        """Rimuove un ID giocatore da una lista."""
        player_ref = db.collection(self.players_coll).document(str(player_id))
        
        # Atomically remove a region from the 'list_ids' array field.
        player_ref.update({
            'list_ids': firestore.ArrayRemove([list_id])
        })
        
        return {"status": "removed"}
    
    def get_list_players(self, list_id):
        """Trova tutti i giocatori che appartengono a questa lista."""
        # Query players where list_ids contains list_id
        docs = db.collection(self.players_coll).where('list_ids', 'array_contains', list_id).stream()
        players = []
        for doc in docs:
            p = doc.to_dict()
            p['player_id'] = doc.id
            players.append(p)
        return players
