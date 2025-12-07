import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { OrganizerPageRoutingModule } from './organizer-routing.module';

import { OrganizerPage } from './organizer.page';
import { EventFormPageModule } from '../event-form/event-form.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    OrganizerPageRoutingModule,
    EventFormPageModule
  ],
  declarations: [OrganizerPage]
})
export class OrganizerPageModule {}
