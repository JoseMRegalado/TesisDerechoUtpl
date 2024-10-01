import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { environment } from '../environments/environment';
import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { HomeComponent } from './components/home/home.component';
import {RouterModule, RouterOutlet, Routes} from "@angular/router";
import { LoginComponent } from './components/login/login.component';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import { InfoComponent } from './components/info/info.component';
import { ProfileComponent } from './components/profile/profile.component';
import { PersonalDataComponent } from './components/personal-data/personal-data.component';
import { BarComponent } from './components/bar/bar.component';
import { DocumentosComponent } from './components/documentos/documentos.component';
import { Footer2Component } from './components/footer2/footer2.component';

import { TextComponent } from './text/text.component';
import { AdminDataComponent } from './components/admin-data/admin-data.component';
import {AngularFireFunctionsModule} from "@angular/fire/compat/functions";
import { CicloComponent } from './components/ciclo/ciclo.component';
import { FlujoComponent } from './components/flujo/flujo.component';
import { HeadingComponent } from './components/heading/heading.component';

const appRoutes: Routes = [
  {path: 'home', component: HomeComponent},
  {path: '', component: HomeComponent},
  {path: 'login', component: LoginComponent},
  {path: 'info', component: InfoComponent},
  {path: 'profile', component: ProfileComponent},
  { path: 'personal', component: PersonalDataComponent },
  { path: 'docs', component: DocumentosComponent },
  { path: 'data', component: AdminDataComponent },
  { path: 'ciclo', component: CicloComponent },
  { path: 'flujo', component: FlujoComponent },
];

@NgModule({
  declarations: [AppComponent, HeaderComponent, FooterComponent, HomeComponent, LoginComponent, InfoComponent, ProfileComponent, PersonalDataComponent, BarComponent, DocumentosComponent, Footer2Component,  TextComponent, AdminDataComponent, CicloComponent, FlujoComponent, HeadingComponent],
  imports: [
    BrowserModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireAuthModule,
    AngularFirestoreModule,
    RouterOutlet,
    RouterModule.forRoot(appRoutes),
    FormsModule,
    AngularFireFunctionsModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
