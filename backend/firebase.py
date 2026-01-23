import firebase_admin
from firebase_admin import credentials, firestore
import requests
import xml.etree.ElementTree as ET
from datetime import datetime
import pytz # Potrebbe servire per gestire le timezone se necessario, ma proviamo senza per ora se Hattrick è naive o UTC

# Inizializza l'app Firebase solo se non è già stata inizializzata
if not firebase_admin._apps:
    # Su Cloud Run/Functions, le credenziali di default (Service Account) vengono rilevate automaticamente
    firebase_admin.initialize_app()

db = firestore.client()
class UserManager:
    def __init__(self):
        self.collection_name = 'users'

    def get_user_profile(self, email):
        """Recupera il profilo utente (userid, team_ids) tramite email."""
        if not email:
            raise ValueError("Email mancante.")
        
        doc = db.collection(self.collection_name).document(email).get()
        if not doc.exists:
            return None
        
        return doc.to_dict()

    def update_user_profile(self, email, profile_data):
        """Crea o aggiorna il profilo utente. Aspetta userid e team_ids (list)."""
        if not email:
            raise ValueError("Email mancante.")
        
        # Pulizia dati
        clean_data = {
            'userid': str(profile_data.get('userid', '')),
            'team_ids': profile_data.get('team_ids', []),
            'updated_at': firestore.SERVER_TIMESTAMP
        }
        
        db.collection(self.collection_name).document(email).set(clean_data, merge=True)
        return {"status": "success", "email": email}

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

    def get_coach_teams(self, coach_email):
        """Ritorna i team di cui l'utente è proprietario (Coach)."""
        docs = db.collection(self.collection_name).where('owner', '==', coach_email).stream()
        teams = []
        for doc in docs:
            t = doc.to_dict()
            t['id'] = doc.id
            teams.append(t)
        return teams

    def is_coach_of(self, coach_email, team_id):
        """Verifica se l'utente è il coach di uno specifico team."""
        doc = db.collection(self.collection_name).document(team_id).get()
        if not doc.exists:
            return False
        return doc.to_dict().get('owner') == coach_email

    def is_any_coach(self, email):
        """Verifica se l'utente è coach di almeno un team."""
        docs = db.collection(self.collection_name).where('owner', '==', email).limit(1).stream()
        for doc in docs:
            return True
        return False

class MembershipManager:
    def __init__(self):
        self.collection_name = 'memberships'

    def set_membership(self, email, team_id, role):
        """Aggiunge o aggiorna l'appartenenza di un utente ad un team."""
        # Usiamo un ID deterministico per evitare duplicati
        membership_id = f"{email}_{team_id}"
        data = {
            'email': email,
            'team_id': team_id,
            'role': role,
            'updated_at': firestore.SERVER_TIMESTAMP
        }
        db.collection(self.collection_name).document(membership_id).set(data)
        return {"status": "success", "membership_id": membership_id}

    def get_user_memberships(self, email):
        """Ritorna tutti i team a cui l'utente appartiene (scout/assistant)."""
        docs = db.collection(self.collection_name).where('email', '==', email).stream()
        memberships = []
        for doc in docs:
            memberships.append(doc.to_dict())
        return memberships

    def get_team_members(self, team_id):
        """Ritorna tutti i membri di uno specifico team."""
        docs = db.collection(self.collection_name).where('team_id', '==', team_id).stream()
        members = []
        for doc in docs:
            members.append(doc.to_dict())
        return members

class RoleManager:
    def __init__(self):
        self.team_manager = TeamManager()
        self.membership_manager = MembershipManager()

    def get_user_context(self, email):
        """
        Ritorna il contesto completo dell'utente:
        - I team di cui è Coach
        - I team di cui è Membro (scout/assistant)
        """
        owned_teams = self.team_manager.get_coach_teams(email)
        memberships = self.membership_manager.get_user_memberships(email)
        
        # Arricchiamo le membership con le info del team (nome, tipo)
        enriched_memberships = []
        for m in memberships:
            team_id = m.get('team_id')
            team_doc = db.collection('teams').document(team_id).get()
            if team_doc.exists:
                m['team_info'] = team_doc.to_dict()
                m['team_info']['id'] = team_doc.id
            enriched_memberships.append(m)
        
        return {
            "owned_teams": owned_teams,
            "memberships": enriched_memberships,
            "is_any_coach": len(owned_teams) > 0
        }

    def set_role(self, requester_email, target_email, new_role, team_id):
        """
        Assegna un ruolo (scout/assistant) ad un utente per un team specifico.
        Solo l'owner del team può farlo.
        """
        if not self.team_manager.is_coach_of(requester_email, team_id):
            raise PermissionError("Solo il Coach del team può assegnare ruoli per questo team.")
        
        return self.membership_manager.set_membership(target_email, team_id, new_role)
    
    def get_managed_league_ids(self, email):
        """
        Ritorna la lista delle NativeLeagueID che l'utente può gestire.
        """
        owned_teams = self.team_manager.get_coach_teams(email)
        memberships = self.membership_manager.get_user_memberships(email)
        
        managed_league_ids = set()
        
        # 1. Team owned
        for t in owned_teams:
            nlid = t.get('NativeLeagueID')
            if nlid:
                managed_league_ids.add(str(nlid))
        
        # 2. Memberships
        for m in memberships:
            tid = m.get('team_id')
            if tid:
                team_doc = db.collection('teams').document(tid).get()
                if team_doc.exists:
                    nlid = team_doc.to_dict().get('NativeLeagueID')
                    if nlid:
                        managed_league_ids.add(str(nlid))
        
        return list(managed_league_ids)
    
    def get_all_managed_users(self, requester_email):
        """Ritorna tutti gli utenti in tutti i team gestiti da questo coach."""
        owned_teams = self.team_manager.get_coach_teams(requester_email)
        all_members = []
        for team in owned_teams:
            members = self.membership_manager.get_team_members(team['id'])
            for m in members:
                m['team_info'] = team
                all_members.append(m)
        return all_members

class ListManager:
    def __init__(self):
        self.lists_coll = 'lists'
        self.players_coll = 'players-details'
        self.role_manager = RoleManager()
    
    def _get_visible_team_ids(self, email):
        """Aggrega tutti i team_id a cui l'utente ha accesso."""
        ctx = self.role_manager.get_user_context(email)
        ids = [t['id'] for t in ctx['owned_teams']]
        ids += [m['team_id'] for m in ctx['memberships']]
        return list(set(ids))

    def get_lists(self, user_email):
        """Ritorna tutte le liste visibili all'utente (coach o membro)."""
        team_ids = self._get_visible_team_ids(user_email)
        if not team_ids:
            return []

        # Firestore limit: array_in supporta fino a 30 elementi.
        # Se sono di più andrebbe divisa in più query, ma per ora assumiamo < 30.
        docs = db.collection(self.lists_coll).where('team_id', 'in', team_ids).stream()
        lists = []
        for doc in docs:
            l = doc.to_dict()
            l['id'] = doc.id
            lists.append(l)
        return lists

    def create_list(self, user_email, name, team_id):
        """Crea una nuova lista associata ad un team specifico di cui si ha accesso."""
        team_ids = self._get_visible_team_ids(user_email)
        if team_id not in team_ids:
            raise PermissionError("Non hai permessi per creare liste in questo team.")
        
        data = {
            'name': name,
            'owner': user_email,
            'team_id': team_id,
            'created_at': firestore.SERVER_TIMESTAMP
        }
        update_time, doc_ref = db.collection(self.lists_coll).add(data)
        return {"id": doc_ref.id, "status": "created", "team_id": team_id}

    def delete_list(self, user_email, list_id):
        """Elimina una lista se si ha accesso al team relativo."""
        doc_ref = db.collection(self.lists_coll).document(list_id)
        snapshot = doc_ref.get()
        
        if not snapshot.exists:
            return {"status": "not_found"}
            
        data = snapshot.to_dict()
        team_id = data.get('team_id')
        
        team_ids = self._get_visible_team_ids(user_email)
        if team_id not in team_ids:
             raise PermissionError("Non hai permessi su questa lista.")

        doc_ref.delete()
        return {"id": list_id, "status": "deleted"}

    def add_player(self, user_email, list_id, player_id):
        """Aggiunge un giocatore ad una lista se l'utente ha i permessi sulla nazione del giocatore."""
        # 1. Verifica accesso alla lista
        doc_list = db.collection(self.lists_coll).document(list_id).get()
        if not doc_list.exists:
            return {"status": "error", "message": "Lista non trovata"}
        
        team_id = doc_list.to_dict().get('team_id')
        team_ids = self._get_visible_team_ids(user_email)
        if team_id not in team_ids:
            raise PermissionError("Non hai permessi su questa lista.")

        # 2. Verifica permessi sul giocatore (NativeLeagueID)
        player_ref = db.collection(self.players_coll).document(str(player_id))
        player_snap = player_ref.get()
        if not player_snap.exists:
            return {"status": "error", "message": "Giocatore non trovato nel database."}
        
        player_data = player_snap.to_dict()
        player_league_id = str(player_data.get('NativeLeagueID', ''))
        
        # Recuperiamo i league ID gestiti dall'utente
        from firebase import RoleManager # Import locale per evitare circolarità se presente
        role_mgr = RoleManager()
        managed_league_ids = role_mgr.get_managed_league_ids(user_email)
        
        if player_league_id not in managed_league_ids:
            raise PermissionError(f"Non hai i permessi per gestire giocatori della nazione {player_league_id}.")

        # 3. Procedi con l'aggiunta
        player_ref.set({
            'list_ids': firestore.ArrayUnion([list_id])
        }, merge=True)
        return {"status": "added"}
    
    def remove_player(self, list_id, player_id):
        player_ref = db.collection(self.players_coll).document(str(player_id))
        player_ref.update({
            'list_ids': firestore.ArrayRemove([list_id])
        })
        return {"status": "removed"}
    
    def get_list_players(self, list_id):
        docs = db.collection(self.players_coll).where('list_ids', 'array_contains', list_id).stream()
        players = []
        for doc in docs:
            p = doc.to_dict()
            p['player_id'] = doc.id
            players.append(p)
        return players
class PlayerManager:
    def __init__(self):
        self.players_coll = 'players-details'
        self.list_manager = ListManager()

    def get_list_players_detailed(self, user_email, list_id):
        """
        Ritorna i dettagli completi di tutti i giocatori in una lista.
        """
        # Rimosso il check sui permessi lista come richiesto
        docs = db.collection(self.players_coll).where('list_ids', 'array_contains', list_id).stream()
        players = []
        for doc in docs:
            p = doc.to_dict()
            p['id'] = doc.id
            players.append(p)
        return players

    def get_my_players(self, user_email):
        """
        Ritorna tutti i giocatori appartenenti all'utente (indipendente dalle liste).
        """
        if not user_email:
            return []
        docs = db.collection(self.players_coll).where('owner_email', '==', user_email).stream()
        players = []
        for doc in docs:
            p = doc.to_dict()
            p['id'] = doc.id
            players.append(p)
        return players

    def get_player(self, user_email, player_id):
        """
        Ritorna i dettagli di un singolo giocatore.
        """
        doc_ref = db.collection(self.players_coll).document(str(player_id))
        snapshot = doc_ref.get()
        if not snapshot.exists:
            return None
        
        player_data = snapshot.to_dict()
        player_data['id'] = snapshot.id
        # Rimosso check intersection con liste visibili
        return player_data

    def _clean_data(self, data):
        """
        Rimuove i valori None dalla mappa per evitare problemi con Firestore 
        e pulisce le chiavi da eventuali spazi bianchi extra.
        """
        clean = {}
        for k, v in data.items():
            if v is not None:
                # Se è una stringa vuota, Firestore la accetta, 
                # ma potremmo volerla saltare se crea problemi.
                clean[k.strip()] = v
        return clean

    def save_player(self, user_email, player_data):
        """
        Salva o aggiorna un giocatore assicurando il riferimento all'utente (owner_email).
        """
        player_data = self._clean_data(player_data)
        
        # Cerca PlayerID in modo case-insensitive se necessario, 
        # ma qui assumiamo il formato standard.
        pid_raw = player_data.get('PlayerID')
        if pid_raw is None or str(pid_raw).strip() == "":
            raise ValueError("PlayerID mancante o non valido dopo la pulizia.")
        
        player_id = str(pid_raw).strip()
        player_data['owner_email'] = user_email
        player_data['updated_at'] = firestore.SERVER_TIMESTAMP
        
        try:
            db.collection(self.players_coll).document(player_id).set(player_data, merge=True)
            return {"id": player_id, "status": "saved"}
        except Exception as e:
            print(f"Error saving player {player_id}: {e}")
            raise e

    def import_players(self, user_email, players_list):
        """
        Salva una lista di giocatori in batch (max 500 per batch).
        """
        if not players_list:
            return {"status": "success", "count": 0}

        batch = db.batch()
        count = 0
        total = 0
        
        for p_raw in players_list:
            try:
                p = self._clean_data(p_raw)
                pid_raw = p.get('PlayerID')
                
                if pid_raw is None or str(pid_raw).strip() == "":
                    # Salta righe invalide
                    continue
                
                player_id = str(pid_raw).strip()
                p['owner_email'] = user_email
                p['updated_at'] = firestore.SERVER_TIMESTAMP
                
                doc_ref = db.collection(self.players_coll).document(player_id)
                batch.set(doc_ref, p, merge=True)
                
                count += 1
                total += 1
                
                if count == 500:
                    batch.commit()
                    batch = db.batch()
                    count = 0
            except Exception as row_err:
                print(f"Skipping row due to error: {row_err}")
                continue
        
        if count > 0:
            batch.commit()
            
        return {"status": "success", "imported_count": total}

    def sync_players_from_mock(self, user_email):
        """
        Sincronizza i giocatori chiamando il mock API (lista + dettagli individuali) 
        e confrontando le date.
        """
        base_url = "https://nt-data-lab-705728164092.europe-west1.run.app/mock"
        list_url = f"{base_url}?file=players&version=2.7"
        
        try:
            # 1. Recupera la lista principale dei giocatori
            response = requests.get(list_url, timeout=10)
            if response.status_code != 200:
                print(f"Sync failed: mock list returned {response.status_code}")
                return {"error": f"Failed to fetch mock list: {response.status_code}"}
            
            root_list = ET.fromstring(response.content)
            fetched_date_str = root_list.findtext('FetchedDate')
            if not fetched_date_str:
                return {"error": "FetchedDate non trovato nell'XML della lista"}
            
            # Formato Hattrick: 2026-01-23 12:13:20
            fetched_date = datetime.strptime(fetched_date_str, '%Y-%m-%d %H:%M:%S').replace(tzinfo=pytz.UTC)
            
            synced_ids = []
            
            # 2. Cicla sui giocatori presenti nella lista
            for player_el in root_list.findall('.//Player'):
                p_data = {}
                for child in player_el:
                    if child.text: # Salta tag vuoti o complessi non gestiti qui
                        p_data[child.tag] = child.text
                
                player_id = p_data.get('PlayerID')
                if not player_id:
                    continue
                
                # --- RECUPERO DETTAGLI INDIVIDUALI ---
                detail_url = f"{base_url}?file=playerdetails&version=3.1&actionType=view&playerID={player_id}"
                try:
                    detail_res = requests.get(detail_url, timeout=5)
                    if detail_res.status_code == 200:
                        detail_root = ET.fromstring(detail_res.content)
                        
                        # UserID dalla radice dell'XML di dettaglio
                        xml_user_id = detail_root.findtext('UserID')
                        if xml_user_id:
                            p_data['UserID'] = xml_user_id

                        player_detail = detail_root.find('Player')
                        if player_detail is not None:
                            # Mergia i campi del dettaglio
                            for d_child in player_detail:
                                if d_child.tag == 'PlayerSkills':
                                    # Appiattisce le skill (es. StaminaSkill, KeeperSkill)
                                    for skill in d_child:
                                        p_data[skill.tag] = skill.text
                                elif d_child.tag == 'OwningTeam':
                                    # Info dal team proprietario
                                    p_data['TeamID'] = d_child.findtext('TeamID')
                                    p_data['TeamName'] = d_child.findtext('TeamName')
                                    p_data['OwningTeam_LeagueID'] = d_child.findtext('LeagueID')
                                elif d_child.text:
                                    # Altri campi piatti (NativeLeagueID, NextBirthDay, etc.)
                                    p_data[d_child.tag] = d_child.text
                except Exception as detail_err:
                    print(f"Warning: could not fetch details for player {player_id}: {detail_err}")

                # --- CONTROLLO E SALVATAGGIO ---
                doc_ref = db.collection(self.players_coll).document(str(player_id))
                snapshot = doc_ref.get()
                
                should_update = False
                if not snapshot.exists:
                    should_update = True
                else:
                    existing_data = snapshot.to_dict()
                    updated_at = existing_data.get('updated_at')
                    
                    if updated_at:
                        if hasattr(updated_at, 'tzinfo') and updated_at.tzinfo is None:
                            updated_at = updated_at.replace(tzinfo=pytz.UTC)
                        
                        if fetched_date > updated_at:
                            should_update = True
                    else:
                        should_update = True
                
                if should_update:
                    p_data['owner_email'] = user_email
                    p_data['updated_at'] = fetched_date
                    p_data = self._clean_data(p_data)
                    doc_ref.set(p_data, merge=True)
                    synced_ids.append(player_id)
            
            return {"status": "success", "synced_count": len(synced_ids), "synced_ids": synced_ids}
            
        except Exception as e:
            print(f"Error during sync: {e}")
            return {"error": str(e)}

    def search_players(self, user_email, query):
        """
        Cerca giocatori nella collection players-details filtrando per i league ID 
        gestiti dall'utente.
        """
        from firebase import RoleManager
        role_mgr = RoleManager()
        managed_league_ids = role_mgr.get_managed_league_ids(user_email)
        
        if not managed_league_ids:
            return []

        # Cerchiamo sia come stringa che come intero per sicurezza sui tipi in Firestore
        search_ids = []
        for lid in managed_league_ids:
            search_ids.append(str(lid))
            try:
                search_ids.append(int(lid))
            except:
                pass
        
        # Eliminiamo duplicati e prepariamo batch da 30 (limite Firestore)
        search_ids = list(set(search_ids))
        
        all_allowed_players = []
        for i in range(0, len(search_ids), 30):
            batch = search_ids[i:i+30]
            
            # 1. Cerca per NativeLeagueID (usato nei dettagli completi)
            docs_native = db.collection(self.players_coll).where('NativeLeagueID', 'in', batch).stream()
            for doc in docs_native:
                p = doc.to_dict()
                p['id'] = doc.id
                if p['id'] not in [ap['id'] for ap in all_allowed_players]:
                    full_name = f"{p.get('FirstName', '')} {p.get('LastName', '')}".lower()
                    if not query or query.lower() in full_name:
                        all_allowed_players.append(p)

            # 2. Cerca per CountryID (usato nei sync preliminari o import CSV)
            docs_country = db.collection(self.players_coll).where('CountryID', 'in', batch).stream()
            for doc in docs_country:
                p = doc.to_dict()
                p['id'] = doc.id
                if p['id'] not in [ap['id'] for ap in all_allowed_players]:
                    full_name = f"{p.get('FirstName', '')} {p.get('LastName', '')}".lower()
                    if not query or query.lower() in full_name:
                        all_allowed_players.append(p)
                    
        return all_allowed_players
