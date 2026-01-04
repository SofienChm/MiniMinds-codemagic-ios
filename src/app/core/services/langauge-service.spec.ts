import { TestBed } from '@angular/core/testing';

import { LanguageService } from './langauge-service';

describe('LangaugeService', () => {
  let service: LanguageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LanguageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
