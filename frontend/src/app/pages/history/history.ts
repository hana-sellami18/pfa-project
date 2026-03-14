import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './history.html',
  styleUrls: ['./history.css']
})
export class History implements OnInit {
  resumes: any[] = [];
  userName = ''; // Remplace dynamiquement selon ton auth
  resumeAfficheId: number | null = null; // Pour gérer l’affichage du résumé sélectionné

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      this.router.navigate(['/login']);
      return;
    }

    this.http.get<any[]>(`http://localhost:5000/historique/resumes/${userId}`)
      .subscribe(data => {
        this.resumes = data.reverse();
      });
  }

  voir(resume: any) {
    if (this.resumeAfficheId === resume.id) {
      this.resumeAfficheId = null; // Cacher si déjà affiché
    } else {
      this.resumeAfficheId = resume.id; // Afficher résumé sélectionné
    }
  }

  telecharger(resume: any) {
    const blob = new Blob([resume.texte_resume], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume_${resume.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  supprimer(resume: any) {
    if (!confirm('Supprimer ce résumé ?')) return;

    this.http.delete(`http://localhost:5000/resumes/${resume.id}`)
      .subscribe(() => {
        this.resumes = this.resumes.filter(r => r.id !== resume.id);
        if (this.resumeAfficheId === resume.id) {
          this.resumeAfficheId = null;
        }
      });
  }
}
