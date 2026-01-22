import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleService } from '../services/role.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-manage-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './manage-roles.component.html',
  styleUrl: './manage-roles.component.css'
})
export class ManageRolesComponent implements OnInit {
  users: any[] = [];
  existingTeams: any[] = [];

  targetEmail: string = '';
  selectedRole: string = 'scout';

  // Team Selection
  teamName: string = '';
  teamType: string = 'NT'; // NT or U21
  isNewTeam: boolean = false;
  selectedExistingTeamId: string = '';

  isLoading = false;
  message = '';

  constructor(private roleService: RoleService) { }

  ngOnInit() {
    this.loadUsers();
    this.loadTeams();
  }

  loadUsers() {
    this.isLoading = true;
    this.roleService.getAllUsers().subscribe({
      next: (res) => {
        this.users = res.users;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.message = 'Errore caricamento utenti (Sei un Coach?)';
        this.isLoading = false;
      }
    });
  }

  loadTeams() {
    this.roleService.getCoachTeams().subscribe({
      next: (res) => {
        this.existingTeams = res.teams || [];
      },
      error: (err) => console.error('Errore caricamento team', err)
    });
  }

  onExistingTeamChange() {
    const team = this.existingTeams.find(t => t.id === this.selectedExistingTeamId);
    if (team) {
      this.teamName = team.name;
      this.teamType = team.type;
    }
  }

  assignRole() {
    if (!this.targetEmail) return;

    // Se stiamo selezionando un team esistente, assicuriamoci che i valori siano sincronizzati
    if (!this.isNewTeam && this.selectedExistingTeamId) {
      this.onExistingTeamChange();
    }

    this.roleService.setRole(this.targetEmail, this.selectedRole, this.teamName, this.teamType).subscribe({
      next: (res) => {
        this.message = `Ruolo ${this.selectedRole} assegnato a ${this.targetEmail}`;
        this.targetEmail = '';
        this.loadUsers();
        // Ricarica team se ne abbiamo creato uno nuovo
        if (this.isNewTeam) {
          this.loadTeams();
          this.isNewTeam = false;
          this.teamName = '';
        }
      },
      error: (err) => {
        console.error(err);
        if (err.error && err.error.error) {
          this.message = 'Errore: ' + err.error.error;
        } else {
          this.message = 'Errore assegnazione ruolo';
        }
      }
    });
  }
}
