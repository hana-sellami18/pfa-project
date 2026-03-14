import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import {
Auth,
createUserWithEmailAndPassword,
GoogleAuthProvider,
signInWithPopup
} from '@angular/fire/auth';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
selector: 'app-register',
standalone: true,
templateUrl: './register.html',
styleUrls: ['./register.css'],
imports: [FormsModule, RouterModule, CommonModule, HttpClientModule]
})
export class RegisterComponent {
email: string = '';
username: string = '';
password: string = '';
confirmPassword: string = '';
errorMessage: string = '';

private auth: Auth = inject(Auth);
private http = inject(HttpClient);

constructor(private router: Router) {}

async onSubmit() {
this.errorMessage = '';

// 🛡️ Vérifications frontend
if (!this.email || !this.username || !this.password || !this.confirmPassword) {
  this.errorMessage = 'Tous les champs sont obligatoires.';
  return;
}

if (this.password !== this.confirmPassword) {
  this.errorMessage = 'Les mots de passe ne correspondent pas.';
  return;
}

try {
  // ✅ Création compte Firebase
  const result = await createUserWithEmailAndPassword(this.auth, this.email, this.password);
  const user = result.user;

  // ✅ Appel backend Flask pour enregistrer dans MySQL
  await firstValueFrom(
    this.http.post('http://localhost:5000/register', {
      nom: this.username,
      email: this.email,
      mot_de_passe: this.password
    })
  );

  // ✅ Stockage & redirection
  localStorage.setItem('userEmail', user.email || '');
  localStorage.setItem('userUID', user.uid);
  this.router.navigate(['/summarize']);
} catch (error: any) {
  console.error('Erreur :', error);
  // 🔍 Gestion d’erreur backend
  if (error?.error?.message) {
    this.errorMessage = error.error.message;
  } else {
    this.errorMessage = error.message || 'Erreur inconnue.';
  }
}
}

async signInWithGoogle() {
this.errorMessage = '';


try {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(this.auth, provider);
  const user = result.user;

  // ✅ Enregistrement via backend
  await firstValueFrom(
    this.http.post('http://localhost:5000/register/google', {
      email: user.email,
      nom: user.displayName || 'Utilisateur Google'
    })
  );

  // ✅ Redirection
  localStorage.setItem('userEmail', user.email || '');
  localStorage.setItem('userUID', user.uid);
  this.router.navigate(['/summarize']);
} catch (error: any) {
  console.error('Erreur Google :', error);
  this.errorMessage = error.message || 'Erreur avec Google.';
}
}
}
