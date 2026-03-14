import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './components/navbar/navbar'; // vérifie bien le chemin

@Component({
selector: 'app-root',
standalone: true,
imports: [CommonModule, RouterModule, NavbarComponent],
templateUrl: './app.html',
styleUrl: './app.css',
})
export class AppComponent {
isLoggedIn() {
return true; // mets true temporairement pour tester l'affichage de la navbar
}
}
