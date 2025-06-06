import { TestBed } from '@angular/core/testing';

import { MeligoService } from './meligo.service';

describe('MeligoService', () => {
  let service: MeligoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MeligoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
