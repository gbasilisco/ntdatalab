import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ListService } from '../services/list.service';
import { TranslateModule } from '@ngx-translate/core';
import { RoleService } from '../services/role.service';

@Component({
  selector: 'app-manage-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  templateUrl: './manage-list.component.html',
  styleUrl: './manage-list.component.css'
})
export class ManageListComponent implements OnInit {
  lists: any[] = [];
  newListName = '';
  selectedTeamId = '';
  myTeams: any[] = [];
  isLoading = false;

  constructor(
    private listService: ListService,
    private roleService: RoleService
  ) { }

  ngOnInit() {
    this.loadLists();
    this.loadUserTeams();
  }

  loadUserTeams() {
    this.roleService.getUserContext().subscribe({
      next: (ctx: any) => {
        const owned = ctx.owned_teams || [];
        const memberships = ctx.memberships || [];

        const memberTeams = memberships
          .filter((m: any) => m.team_info)
          .map((m: any) => m.team_info);

        const allTeams = [...owned, ...memberTeams];
        this.myTeams = Array.from(new Map(allTeams.map(t => [t.id, t])).values());

        if (this.myTeams.length > 0 && !this.selectedTeamId) {
          this.selectedTeamId = this.myTeams[0].id;
        }
      }
    });
  }

  loadLists() {
    this.isLoading = true;
    this.listService.getLists().subscribe({
      next: (res: any) => {
        this.lists = res.lists;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  createList() {
    if (!this.newListName || !this.selectedTeamId) return;

    this.listService.createList(this.newListName, this.selectedTeamId).subscribe({
      next: () => {
        this.newListName = '';
        this.loadLists();
      },
      error: (err: any) => console.error(err)
    });
  }

  deleteList(listId: string) {
    if (!confirm('Sei sicuro?')) return;

    this.listService.deleteList(listId).subscribe({
      next: () => this.loadLists(),
      error: (err: any) => console.error(err)
    });
  }
}
