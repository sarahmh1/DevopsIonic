import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Storage } from '@ionic/storage-angular';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  userType: 'organizer' | 'participant' = 'participant';
  email: string = '';
  password: string = '';
  isLoading: boolean = false;

  constructor(
    private router: Router, 
    private storage: Storage,
    private apiService: ApiService
  ) {}

  async ngOnInit() {
    // Initialise le Storage Ionic (prépare set/get locaux).
    await this.storage.create();
  }

  async login() {
    // Authentifie l'utilisateur, stocke token/user et redirige selon rôle.
    const email = this.email?.trim() || '';
    const password = this.password?.trim() || '';

    if (!email || !password) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    this.isLoading = true;

    try {
  const response = await this.apiService.login(email, password);

  await this.storage.set('token', response.token);
  await this.storage.set('user', response.user);

      if (response.user.type === 'organizer') {
        this.router.navigate(['/organizer']);
      } else {
        this.router.navigate(['/participant']);
      }
    } catch (error: any) {
      alert(error.error?.message || 'Erreur de connexion');
    } finally {
      this.isLoading = false;
    }
  }

  async register() {
    // Crée un compte (utilitaire depuis la page de login), puis connecte.
    const email = this.email?.trim() || '';
    const password = this.password?.trim() || '';

    if (!email || !password) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    this.isLoading = true;

    try {
  const response = await this.apiService.register(email, password, this.userType);

  await this.storage.set('token', response.token);
  await this.storage.set('user', response.user);

      if (response.user.type === 'organizer') {
        this.router.navigate(['/organizer']);
      } else {
        this.router.navigate(['/participant']);
      }
    } catch (error: any) {
      alert(error.error?.message || 'Erreur lors de la création du compte');
    } finally {
      this.isLoading = false;
    }
  }
}
