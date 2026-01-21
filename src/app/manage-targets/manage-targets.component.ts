import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { TargetsService, UserTarget } from '../services/targets.service';

@Component({
  selector: 'app-manage-targets',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './manage-targets.component.html',
  styleUrl: './manage-targets.component.css'
})
export class ManageTargetsComponent implements OnInit {

  targets: UserTarget[] = [];
  groupedTargets: { [key: string]: UserTarget[] } = {};
  objectKeys = Object.keys; // Per usare Keys nel template

  isLoading = false;

  // Gestione Nomi
  existingNames: string[] = [];
  isNewName = true; // Toggle per input vs select

  // Model per il form
  newTarget: UserTarget = {
    role: 'midfielder',
    name: '',
    variant: 'Normal',
    stats: {
      'goalkeeping': 0,
      'defending': 0,
      'playmaking': 0,
      'winger': 0,
      'passing': 0,
      'scoring': 0,
      'set pieces': 0
    }
  };

  availableRoles = [
    { label: 'Centrocampista (Midfielder)', value: 'midfielder' },
    { label: 'Difensore (Defender)', value: 'defender' },
    { label: 'Terzino (Wingback)', value: 'wingback' },
    { label: 'Attaccante (Forward)', value: 'forward' },
    { label: 'Ala (Winger)', value: 'winger' },
    { label: 'Portiere (Goalkeeper)', value: 'goalkeeper' }
  ];

  availableStats = [
    'goalkeeping', 'defending', 'playmaking', 'winger', 'passing', 'scoring', 'set pieces'
  ];

  constructor(private targetsService: TargetsService) { }

  ngOnInit(): void {
    this.loadTargets();
  }

  loadTargets() {
    this.isLoading = true;
    this.targetsService.getTargets().subscribe({
      next: (res) => {
        this.targets = res.targets || [];
        this.processTargets();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Errore caricamento targets', err);
        this.isLoading = false;
      }
    });
  }

  processTargets() {
    // 1. Estrai nomi univoci
    const names = new Set(this.targets.map(t => t.name));
    this.existingNames = Array.from(names).sort();

    // 2. Raggruppa per nome
    this.groupedTargets = {};
    this.targets.forEach(t => {
      if (!this.groupedTargets[t.name]) {
        this.groupedTargets[t.name] = [];
      }
      this.groupedTargets[t.name].push(t);
    });
  }

  saveTarget() {
    if (!this.newTarget.name) {
      alert('Inserisci un nome per il target');
      return;
    }

    // Filtra solo le skill con valore > 0
    const cleanStats: { [key: string]: number } = {};
    for (const [key, value] of Object.entries(this.newTarget.stats)) {
      if (value > 0) {
        cleanStats[key] = value;
      }
    }

    // Crea un oggetto target pulito da inviare
    const targetToSave: UserTarget = {
      ...this.newTarget,
      stats: cleanStats
    };

    this.isLoading = true;
    this.targetsService.saveTarget(targetToSave).subscribe({
      next: (res) => {
        this.loadTargets(); // Ricarica lista
        this.resetForm();
      },
      error: (err) => {
        console.error('Errore salvataggio', err);
        this.isLoading = false;
      }
    });
  }

  deleteTarget(id: string | undefined) {
    if (!id) return;
    if (!confirm('Sei sicuro di voler eliminare questo target?')) return;

    this.isLoading = true;
    this.targetsService.deleteTarget(id).subscribe({
      next: (res) => {
        this.loadTargets();
      },
      error: (err) => {
        console.error('Errore cancellazione', err);
        this.isLoading = false;
      }
    });
  }

  editTarget(target: UserTarget) {
    // Clona per evitare modifiche dirette alla lista prima del salvataggio
    this.newTarget = JSON.parse(JSON.stringify(target));

    // Imposta modalità "esistente" se il nome è nella lista
    this.isNewName = false;

    // Assicuriamoci che tutte le stats siano presenti nel form
    this.availableStats.forEach(s => {
      if (this.newTarget.stats[s] === undefined) {
        this.newTarget.stats[s] = 0;
      }
    });
  }

  resetForm() {
    this.isNewName = true;
    this.newTarget = {
      role: 'midfielder',
      name: '',
      variant: 'Normal',
      stats: {
        'goalkeeping': 0,
        'defending': 0,
        'playmaking': 0,
        'winger': 0,
        'passing': 0,
        'scoring': 0,
        'set pieces': 0
      }
    };
  }
}
