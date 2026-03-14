import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-summarize',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './summarize.html',
  styleUrls: ['./summarize.css'],
})
export class Summarize implements OnInit {
  method: 'extractive' | 'abstractive' = 'extractive';
  inputText: string = '';
  pdfFile: File | null = null;
  nbSentences: number = 3;
  summary: string = '';
  loading: boolean = false;
  errorMessage: string = '';

  // Historique
  textResumes: any[] = [];
  pdfResumes: any[] = [];

  @Output() resumeReady = new EventEmitter<string>();

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadHistory();
  }

  reset() {
    this.inputText = '';
    this.pdfFile = null;
    this.nbSentences = 3;
    this.summary = '';
    this.errorMessage = '';
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.pdfFile = input.files[0];
      this.errorMessage = '';
    }
  }

  generateSummary() {
    this.summary = '';
    this.errorMessage = '';
    this.loading = true;

    const user_id = localStorage.getItem('user_id');
    if (!user_id) {
      this.errorMessage = 'Utilisateur non connecté.';
      this.loading = false;
      return;
    }

    // ================= PDF =================
    if (this.pdfFile) {
      const formData = new FormData();
      formData.append('file', this.pdfFile);
      formData.append('methode', this.method === 'abstractive' ? 't5' : 'extractive');
      formData.append('nb_phrases', this.nbSentences.toString());
      formData.append('user_id', user_id);

      this.http.post<any>('http://127.0.0.1:5000/summarize', formData).subscribe({
        next: (res) => {
          console.log(res);
          this.summary = res.summary;
          this.resumeReady.emit(this.summary);
          this.loading = false;

          if (res.document) {
            this.pdfResumes.unshift(res.document);
          }
        },
        error: (err) => {
          this.errorMessage = err.error?.error || 'Erreur lors du résumé du PDF.';
          this.loading = false;
        },
      });
      return;
    }

    // ================= TEXTE =================
    if (!this.inputText.trim()) {
      this.errorMessage = 'Veuillez entrer un texte.';
      this.loading = false;
      return;
    }

    const payload = {
      texte: this.inputText,
      nb_phrases: this.nbSentences,
      methode: this.method === 'abstractive' ? 't5' : 'extractive',
      user_id: user_id,
    };

    this.http.post<any>('http://127.0.0.1:5000/resumer', payload).subscribe({
      next: (res) => {
        this.summary = res.resume;
        this.resumeReady.emit(this.summary);
        this.loading = false;

        this.textResumes.unshift({
          texte_original: this.inputText,
          texte_resume: res.resume,
          methode: this.method === 'abstractive' ? 't5' : 'extractive'
        });
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Erreur lors du résumé du texte.';
        this.loading = false;
      },
    });
  }

  loadHistory() {
    const user_id = localStorage.getItem('user_id');
    if (!user_id) return;

    this.http.get<any[]>(`http://127.0.0.1:5000/historique/documents/${user_id}`)
      .subscribe(res => this.pdfResumes = res.reverse());

    this.http.get<any[]>(`http://127.0.0.1:5000/historique/resumes/${user_id}`)
      .subscribe(res => this.textResumes = res.reverse());
  }

  copyToClipboard() {
    if (!this.summary) return;
    navigator.clipboard.writeText(this.summary)
      .then(() => alert('Résumé copié dans le presse-papiers ✅'))
      .catch(() => alert('Erreur lors de la copie ❌'));
  }

  downloadSummary() {
    if (!this.summary) return;
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(this.summary, 180);
    doc.text(lines, 10, 20);
    doc.save('resume.pdf');
  }
}
