import { Component } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact.component.html' // template separato
})
export class ContactComponent {
  contactForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    message: ['', Validators.required]
  });

  constructor(private fb: FormBuilder, private afs: AngularFirestore) {}

  submit() {
    if (this.contactForm.valid) {
      this.afs.collection('contacts').add(this.contactForm.value)
        .then(() => {
          alert('Messaggio inviato con successo!');
          this.contactForm.reset();
        })
        .catch(err => {
          console.error(err);
          alert('Errore durante l\'invio del messaggio');
        });
    }
  }
}
