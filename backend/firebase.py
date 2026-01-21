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
