import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ListService } from '../services/list.service';
import { TranslateModule } from '@ngx-translate/core';

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
  isLoading = false;

  constructor(private listService: ListService) { }

  ngOnInit() {
    this.loadLists();
  }

  loadLists() {
    this.isLoading = true;
    this.listService.getLists().subscribe({
      next: (res) => {
        this.lists = res.lists;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  createList() {
    if (!this.newListName) return;

    this.listService.createList(this.newListName).subscribe({
      next: (res) => {
        this.newListName = '';
        this.loadLists();
      },
      error: (err) => console.error(err)
    });
  }

  deleteList(listId: string) {
    if (!confirm('Sei sicuro?')) return;

    this.listService.deleteList(listId).subscribe({
      next: () => this.loadLists(),
      error: (err) => console.error(err)
    });
  }
}
