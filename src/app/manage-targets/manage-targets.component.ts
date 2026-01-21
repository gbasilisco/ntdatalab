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
  isLoading = false;

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
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Errore caricamento targets', err);
        this.isLoading = false;
      }
    });
  }

  saveTarget() {
    if (!this.newTarget.name) {
      alert('Inserisci un nome per il target');
      return;
    }

    // Pulisci stats a 0 se vuoi, o lasciale
    this.isLoading = true;
    this.targetsService.saveTarget(this.newTarget).subscribe({
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
    // Assicuriamoci che tutte le stats siano presenti nel form
    this.availableStats.forEach(s => {
      if (this.newTarget.stats[s] === undefined) {
        this.newTarget.stats[s] = 0;
      }
    });
  }

  resetForm() {
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
