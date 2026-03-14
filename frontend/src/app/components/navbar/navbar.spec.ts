import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Navba } from './navba';

describe('Navba', () => {
  let component: Navba;
  let fixture: ComponentFixture<Navba>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navba]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Navba);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
