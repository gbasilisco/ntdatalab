// core/services/language.service.ts
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class LanguageService {

  private readonly DEFAULT_LANG = 'it';

  constructor(private translate: TranslateService) {
    translate.addLangs(['it', 'en']);
    translate.setDefaultLang(this.DEFAULT_LANG);
  }

  init(): void {
    const lang = localStorage.getItem('lang') || this.DEFAULT_LANG;
    this.translate.use(lang);
  }

  setLanguage(lang: string): void {
    localStorage.setItem('lang', lang);
    this.translate.use(lang);
  }

  getCurrent(): string {
    return this.translate.currentLang || this.DEFAULT_LANG;
  }
}
