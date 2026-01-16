import { Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, NavigationEnd, ActivatedRoute, ActivationEnd } from '@angular/router';
import { RouterModule } from '@angular/router';
import * as Papa from 'papaparse';

import { CsvMapperService } from './services/csv-mapper.service';
import { HattrickCsvRow, PlayerResult, AnalysisResponse } from './models/hattrick.model';
import { AuthService } from './auth/auth.service';

// Angular Material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

import { MaterialModule } from './material/material.module';
import { MakePortalLinkComponent } from './make-portal-link/make-portal-link.component';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, RouterModule, MaterialModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  
    title = 'NT Data Lab';
  compName = '';

  constructor(private router: Router, private authService: AuthService) {

    router.events.subscribe((val) => {
        if (val instanceof ActivationEnd) {
            this.compName = val.snapshot.component!.name
            console.log('componentName:',  this.compName );
        }
    });
}


}