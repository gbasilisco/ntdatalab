import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleService } from '../services/role.service';
import { TranslateModule } from '@ngx-translate/core';
import { COUNTRIES } from '../utils/countries';

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
  selectedTeamId: string = '';

  isLoading = false;
  message = '';

  constructor(private roleService: RoleService) { }

  ngOnInit() {
    this.loadUsers();
    this.loadTeams();
  }

  loadUsers() {
    this.isLoading = true;
    this.roleService.getAllManagedUsers().subscribe({
      next: (res: any) => {
        this.users = res.users;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.message = 'Errore caricamento utenti (Sei un Coach?)';
        this.isLoading = false;
      }
    });
  }

  loadTeams() {
    this.roleService.getCoachTeams().subscribe({
      next: (res: any) => {
        this.existingTeams = res.teams || [];
        if (this.existingTeams.length > 0) {
          this.selectedTeamId = this.existingTeams[0].id;
        }
      },
      error: (err: any) => console.error('Errore caricamento team', err)
    });
  }

  assignRole() {
    if (!this.targetEmail || !this.selectedTeamId) return;

    this.roleService.setRole(this.targetEmail, this.selectedRole, this.selectedTeamId).subscribe({
      next: () => {
        this.message = `Ruolo ${this.selectedRole} assegnato a ${this.targetEmail}`;
        this.targetEmail = '';
        this.loadUsers();
      },
      error: (err: any) => {
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
