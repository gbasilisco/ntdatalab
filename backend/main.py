import functions_framework
from hattrick_advisor import HattrickAdvisor
from firebase import TargetManager

@functions_framework.http
def analyze_player(request):
    """
    HTTP Cloud Function entry point con gestione CORS.
    Supporta sia l'analisi giocatore che la gestione target (CRUD).
    """
    
    # --- 1. GESTIONE CORS (Pre-flight request) ---
    if request.method == 'OPTIONS':
        # Permetti richieste da qualsiasi origine (o metti 'http://localhost:4200')
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    # --- 2. GESTIONE CORS (Main request headers) ---
    # Questi header vanno aggiunti anche alla risposta finale
    headers = {
        'Access-Control-Allow-Origin': '*'
    }

    # --- 3. LOGICA APPLICATIVA ---
    request_json = request.get_json(silent=True)
    
    if not request_json:
        return ({"error": "JSON payload mancante"}, 400, headers)

    try:
        # Check if this is a target management request
        action = request_json.get('action')
        
        if action == 'manage_targets':
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
                 return ({"error": "Metodo non valido"}, 400, headers)

        # Default legacy behavior: Hattrick Analysis
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