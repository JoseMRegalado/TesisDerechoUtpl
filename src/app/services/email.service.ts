import { Injectable } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmailService {

  constructor(private functions: AngularFireFunctions) {}

  // Enviar correo con archivo adjunto
  sendEmailWithAttachment(to: string, attachment: File): Promise<any> {
    const callable = this.functions.httpsCallable('sendEmail');
    // Retorna la promesa
    return callable({ to, attachment }).toPromise();
  }

  // Enviar correo simple
  sendEmail(to: string, text: string) {
    const callable = this.functions.httpsCallable('sendEmail');
    return callable({ to, text }).toPromise();  // httpsCallable gestiona CORS automáticamente
  }
}
