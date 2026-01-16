import functions_framework
from hattrick_advisor import HattrickAdvisor

@functions_framework.http
def analyze_player(request):
    """
    HTTP Cloud Function entry point con gestione CORS.
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
        # Istanzia l'Advisor passando il JSON ricevuto
        advisor = HattrickAdvisor(request_json)
        
        # Esegue tutti i controlli
        report = advisor.run_full_analysis()
        
        # Ritorna il report + status 200 + headers CORS
        return (report, 200, headers)
        
    except Exception as e:
        # Gestione errori generici
        return ({"error": str(e)}, 500, headers)