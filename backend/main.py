import os
import functions_framework
from hattrick_advisor import HattrickAdvisor
from firebase import TargetManager, RoleManager, ListManager, PlayerManager, UserManager

@functions_framework.http
def analyze_player(request):
    """
    HTTP Cloud Function entry point con gestione CORS.
    Funge da router per supportare la retrocompatibilità.
    """
    # --- ROUTING PER MOCK (Retrocompatibilità) ---
    # Log per debug: vediamo cosa arriva
    print(f"DEBUG: Path={request.path}, Args={request.args}")
    
    # Se il path contiene /mock o è presente il parametro 'file', delega a mock(request)
    if 'file' in request.args or '/mock' in request.path:
        return mock(request)

    # --- 1. GESTIONE CORS (Pre-flight request) ---
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    # --- 2. GESTIONE CORS (Main request headers) ---
    headers = {
        'Access-Control-Allow-Origin': '*'
    }

    # --- 3. LOGICA APPLICATIVA ---
    request_json = request.get_json(silent=True)
    
    if not request_json:
        # Se siamo qui, il routing per 'file' o '/mock' sopra ha fallito 
        # E non c'è un body JSON.
        return ({"error": "JSON payload mancante o parametri Mock non riconosciuti (Ver: 1.1)"}, 400, headers)

    try:
        action = request_json.get('action')
        print(f"Backend triggered: action={action}")
        print(f"Request payload: {request_json}")
        
        # --- GESTIONE UTENTI (Profilo) ---
        if action == 'manage_users':
            print(f"DEBUG: manage_users called with request: {request_json}")
            manager = UserManager()
            method = request_json.get('method')
            email = request_json.get('email')
            
            if method == 'get_profile':
                profile = manager.get_user_profile(email)
                return ({"profile": profile}, 200, headers)
            
            elif method == 'update_profile':
                profile_data = request_json.get('profile')
                result = manager.update_user_profile(email, profile_data)
                return (result, 200, headers)
            
            else:
                 return ({"error": "Metodo user non valido"}, 400, headers)
        
        # --- GESTIONE TARGET ---
        elif action == 'manage_targets':
            manager = TargetManager()
            method = request_json.get('method') # get, save, delete
            email = request_json.get('email')
            
            if method == 'get':
                result = manager.get_user_targets(email)
                return ({"targets": result}, 200, headers)
            
            elif method == 'save':
                target_data = request_json.get('target')
                result = manager.save_target(email, target_data)
                return (result, 200, headers)
                
            elif method == 'delete':
                target_id = request_json.get('targetId')
                result = manager.delete_target(email, target_id)
                return (result, 200, headers)
                
            else:
                 return ({"error": "Metodo target non valido"}, 400, headers)

        # --- GESTIONE RUOLI (Coach Only) ---
        elif action == 'manage_roles':
            manager = RoleManager()
            method = request_json.get('method')
            requester = request_json.get('requesterEmail')
            
            if method == 'get_user_context':
                email = request_json.get('email') or requester
                ctx = manager.get_user_context(email)
                return (ctx, 200, headers)

            elif method == 'set_role':
                target_email = request_json.get('targetEmail')
                new_role = request_json.get('newRole')
                team_id = request_json.get('teamId')
                result = manager.set_role(requester, target_email, new_role, team_id)
                return (result, 200, headers)
                
            elif method == 'get_all_managed':
                users = manager.get_all_managed_users(requester)
                return ({"users": users}, 200, headers)

            elif method == 'get_coach_teams':
                # Return all teams where user is either coach OR member for convenience in list mgmt?
                # User asked specifically for lists they can manage.
                ctx = manager.get_user_context(requester)
                return ({"teams": ctx['owned_teams']}, 200, headers)
            
            else:
                 return ({"error": "Metodo role non valido"}, 400, headers)

        # --- GESTIONE LISTE ---
        elif action == 'manage_lists':
            manager = ListManager()
            method = request_json.get('method')
            email = request_json.get('email') # Requester
            
            if method == 'get_lists':
                lists = manager.get_lists(email)
                return ({"lists": lists}, 200, headers)
                
            elif method == 'create_list':
                name = request_json.get('name')
                team_id = request_json.get('teamId')
                result = manager.create_list(email, name, team_id)
                return (result, 200, headers)
                
            elif method == 'delete_list':
                list_id = request_json.get('listId')
                result = manager.delete_list(email, list_id)
                return (result, 200, headers)
                
            elif method == 'add_player':
                list_id = request_json.get('listId')
                player_id = request_json.get('playerId')
                result = manager.add_player(list_id, player_id)
                return (result, 200, headers)
                
            elif method == 'remove_player':
                list_id = request_json.get('listId')
                player_id = request_json.get('playerId')
                result = manager.remove_player(list_id, player_id)
                return (result, 200, headers)
                
            elif method == 'get_list_players':
                list_id = request_json.get('listId')
                players = manager.get_list_players(list_id)
                return ({"players": players}, 200, headers)

            else:
                 return ({"error": "Metodo list non valido"}, 400, headers)

        # --- GESTIONE GIOCATORI ---
        elif action == 'manage_players':
            manager = PlayerManager()
            method = request_json.get('method')
            requester = request_json.get('requesterEmail')
            
            if method == 'get_list_players_detailed':
                list_id = request_json.get('listId')
                players = manager.get_list_players_detailed(requester, list_id)
                return ({"players": players}, 200, headers)
            
            elif method == 'get_my_players':
                players = manager.get_my_players(requester)
                return ({"players": players}, 200, headers)
            
            elif method == 'get_player':
                player_id = request_json.get('playerId')
                player = manager.get_player(requester, player_id)
                return ({"player": player}, 200, headers)

            elif method == 'save_player':
                player_data = request_json.get('playerData')
                result = manager.save_player(requester, player_data)
                return (result, 200, headers)

            elif method == 'import_players':
                players_list = request_json.get('players')
                result = manager.import_players(requester, players_list)
                return (result, 200, headers)

            elif method == 'sync_players':
                result = manager.sync_players_from_mock(requester)
                return (result, 200, headers)
            
            else:
                 return ({"error": "Metodo player non valido"}, 400, headers)

        # --- DEFAULT: ANALISI ---
        # Fetch user targets if email is available
        user_targets = []
        email = request_json.get('email')
        if email:
            try:
                manager = TargetManager()
                user_targets = manager.get_user_targets(email)
            except Exception as e:
                print(f"Warning: could not fetch targets for {email}: {e}")

        # Istanzia l'Advisor passando il JSON ricevuto e i target utente
        advisor = HattrickAdvisor(request_json, user_targets)
        
        # Esegue tutti i controlli
        report = advisor.run_full_analysis()
        
        # Ritorna il report + status 200 + headers CORS
        return (report, 200, headers)
        
    except Exception as e:
        # Gestione errori generici
        return ({"error": str(e)}, 500, headers)

@functions_framework.http
def mock(request):
    """
    Mock function che restituisce file XML in base al parametro ?file=
    """
    # Gestione CORS
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    headers = {
        'Access-Control-Allow-Origin': '*'
    }

    file_param = request.args.get('file')
    if not file_param:
        return ({"error": "Parametro 'file' mancante"}, 400, headers)

    # Costruisce il percorso del file (sicuro)
    file_name = f"{file_param}.xml"
    # Impedisce directory traversal per sicurezza
    if ".." in file_name or "/" in file_name:
         return ({"error": "Nome file non valido"}, 400, headers)
    
    file_path = os.path.join(os.path.dirname(__file__), file_name)

    if not os.path.exists(file_path):
        return ({"error": f"File {file_name} non trovato"}, 404, headers)

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            xml_content = f.read()
        
        headers['Content-Type'] = 'application/xml; charset=utf-8'
        return (xml_content, 200, headers)
    except Exception as e:
        return ({"error": str(e)}, 500, headers)