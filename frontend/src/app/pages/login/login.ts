import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import {
  Auth,
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from '@angular/fire/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
  imports: [FormsModule, RouterModule, CommonModule],
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  errorMessage: string = '';

  auth: Auth = inject(Auth);

  constructor(private router: Router) {}

  async onSubmit() {
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Veuillez entrer votre e-mail et votre mot de passe.';
      return;
    }

    try {
      const methods = await fetchSignInMethodsForEmail(this.auth, this.email);

      if (methods.includes('google.com') && !methods.includes('password')) {
        this.errorMessage =
          'Ce compte a été créé avec Google. Veuillez vous connecter avec Google.';
        return;
      }

      // Connexion classique Firebase
      const result = await signInWithEmailAndPassword(
        this.auth,
        this.email,
        this.password
      );
      const user = result.user;

      // Récupérer le token JWT Firebase
      const token = await user.getIdToken();

      // Stocker le token dans localStorage
      localStorage.setItem('token', token);

      // Stocker aussi les infos utiles
      localStorage.setItem('userEmail', user.email || '');
      localStorage.setItem('userUID', user.uid);

      // Appel API Flask /login pour récupérer user_id
      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.email,
          mot_de_passe: this.password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        this.errorMessage = data.message || 'Erreur de connexion.';
        return;
      }

      const data = await response.json();
      localStorage.setItem('user_id', data.user_id);

      this.router.navigate(['/summarize']);
    } catch (error: any) {
      this.errorMessage = 'E-mail ou mot de passe incorrect.';
    }
  }

  async signInWithGoogle() {
    this.errorMessage = '';

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;

      // Récupérer le token JWT Firebase
      const token = await user.getIdToken();

      // Stocker le token dans localStorage
      localStorage.setItem('token', token);

      localStorage.setItem('userEmail', user.email || '');
      localStorage.setItem('userUID', user.uid);

      // Enregistrement ou récupération via /register/google
      const response = await fetch('http://localhost:5000/register/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          nom: user.displayName || 'Utilisateur Google',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        this.errorMessage = data.message || 'Erreur de connexion avec Google.';
        return;
      }

      localStorage.setItem('user_id', data.user_id);

      this.router.navigate(['/summarize']);
    } catch (error: any) {
      this.errorMessage = 'Erreur lors de la connexion avec Google.';
    }
  }
}
