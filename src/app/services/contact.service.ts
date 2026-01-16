// contact.service.ts
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Injectable({ providedIn: 'root' })
export class ContactService {
  constructor(private firestore: AngularFirestore) {}

  sendMessage(data: any) {
    // Salva nella collezione "contacts"
    return this.firestore.collection('contacts').add(data);
  }
}
