import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-make-portal-link',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './make-portal-link.component.html',
  styleUrls: ['./make-portal-link.component.css']
})
export class MakePortalLinkComponent {
  playerId: string = '';
}
