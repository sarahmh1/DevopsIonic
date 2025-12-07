import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Storage } from '@ionic/storage-angular';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage {
  userType: 'organizer' | 'participant' = 'participant';
  email: string = '';
  password: string = '';
  passwordConfirm: string = '';
  isLoading: boolean = false;

  get passwordsMismatch(): boolean {
    // Ne montrer le message de mismatch que si l'utilisateur a saisi la confirmation.
    if (!this.passwordConfirm) return false;
    return this.password !== this.passwordConfirm;
  }

  constructor(
    private router: Router,
    private storage: Storage,
    private apiService: ApiService
  ) {}

  async ngOnInit() {
    await this.storage.create();
  }

  async register() {
    const email = this.email?.trim() || '';
    const password = this.password?.trim() || '';
    const passwordConfirm = this.passwordConfirm?.trim() || '';

    // Validations client légères (le serveur valide aussi).
    if (!email || !password) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    if (password !== passwordConfirm) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }

    // Vérifie la longueur minimale du mot de passe.
    if (password.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    this.isLoading = true;
    try {
      console.log('Register payload:', { email, password: '***', type: this.userType });
      const response = await this.apiService.register(email, password, this.userType);
      console.log('Register response:', response);

      // Debug: if backend returned a different role than the selected one, show details
      if (response.user?.type && response.user.type !== this.userType) {
        alert(`Attention: rôle demandé = ${this.userType} mais le serveur a renvoyé rôle = ${response.user.type}`);
        console.warn('Role mismatch on register', { requested: this.userType, returned: response.user.type, response });
      }
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
