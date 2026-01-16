import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-make-portal-link',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './make-portal-link.component.html',
  styleUrls: ['./make-portal-link.component.css']
})
export class MakePortalLinkComponent {
  playerId: string = '';
}
