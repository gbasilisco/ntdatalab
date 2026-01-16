import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { map } from 'rxjs/operators';
import { authState } from '@angular/fire/auth';
import { LanguageService } from './language.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const langService = inject(LanguageService);

  

  return authState(auth).pipe(
    map(user => {
      if (user) {
        return true;
      }
      router.navigate(['/login']);
      return false;
    })
  );
};
