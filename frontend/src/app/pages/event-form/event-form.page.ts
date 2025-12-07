import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Storage } from '@ionic/storage-angular';
import { ApiService, Event } from '../../services/api.service';

@Component({
  selector: 'app-event-form',
  templateUrl: './event-form.page.html',
  styleUrls: ['./event-form.page.scss'],
})
export class EventFormPage implements OnInit {
  @Input() event: Event | null = null;
  
  formData = {
    title: '',
    date: '',
    location: '',
    description: ''
  };
  isLoading: boolean = false;

  constructor(
    private modalController: ModalController,
    private storage: Storage,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    // Préremplit le formulaire si `this.event` est fourni (mode édition).
    if (this.event) {
      this.formData = {
        title: this.event.title,
        date: this.event.date,
        location: this.event.location,
        description: this.event.description || ''
      };
    }
  }

  async saveEvent() {
    // Valide et enregistre (création ou édition) l'événement, puis ferme le modal.
    if (!this.formData.title || !this.formData.date || !this.formData.location) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.isLoading = true;

    try {
      if (this.event) {
        // Modification d'un événement existant
        await this.apiService.updateEvent(this.event.id, this.formData);
      } else {
        // Création d'un nouvel événement
        await this.apiService.createEvent(this.formData);
      }
      
      this.modalController.dismiss();
    } catch (error: any) {
      alert(error.error?.message || 'Erreur lors de la sauvegarde');
    } finally {
      this.isLoading = false;
    }
  }

  cancel() {
    // Ferme le modal sans sauvegarder.
    this.modalController.dismiss();
  }
}
