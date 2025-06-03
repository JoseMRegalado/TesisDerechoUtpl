import { Component, OnInit } from '@angular/core';
import { ConsultasService } from '../../services/consultas.service'; // Servicio para obtener datos del director
import { LoginService } from '../../services/login.service'; // Servicio de autenticación
import { EmailService } from '../../services/email.service'; // Servicio para enviar correos
import { formatDate } from '@angular/common';

@Component({
  selector: 'app-admin-data',
  templateUrl: './admin-data.component.html',
  styleUrls: ['./admin-data.component.css']
})
export class AdminDataComponent implements OnInit {
  currentDate: string;
  recuadros: any[] = [];
  director: any = {};
  selectedDateTime: string = '';
  fechaEnvioDirector: string | null = null;

  constructor(
    private consultasService: ConsultasService,
    private loginService: LoginService,
    private emailService: EmailService
  ) {
    this.currentDate = formatDate(new Date(), 'yyyy-MM-dd', 'en');
  }

  ngOnInit() {
    this.loadDirector();
    this.initializeRecuadros();
  }

  // Inicializa los 8 recuadros del primer tipo
  initializeRecuadros() {
    this.recuadros = Array(6).fill(0).map((_, index) => ({
      titulo: `Notificación ${index + 1}`,
      fechaEnvio: null,
      correo: '',
      pdfFile: null
    }));
  }

  // Cargar datos del director desde Firebase
  loadDirector() {
    this.consultasService.getUserByRole('director').subscribe(director => {
      this.director = director;
    });
  }

  // Seleccionar archivo PDF
  onFileSelected(event: any, recuadro: any) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1]; // Codificar a base64
      recuadro.pdfFile = base64String;
    };

    reader.readAsDataURL(file);
  }


    sendEmail(recuadro: any) {
        if (recuadro.correo && recuadro.pdfFile) {
            this.emailService.sendEmailWithAttachment(recuadro.correo, recuadro.pdfFile)
                .then(() => {
                    recuadro.fechaEnvio = this.currentDate; // Guardar la fecha de envío
                    alert('Correo enviado con éxito.');
                })
                .catch((error) => {
                    console.error('Error al enviar el correo:', error);
                    alert('Hubo un problema al enviar el correo.');
                });
        } else {
            alert('Por favor, complete todos los campos.');
        }
    }
    // Enviar correo al director con fecha y hora (segundo tipo)
    sendToDirector() {
        if (this.selectedDateTime) {
            const message = `El grado se realizará el ${this.selectedDateTime}.`;
            this.emailService.sendEmail(this.director.email, message)
                .then(() => {
                    this.fechaEnvioDirector = this.currentDate; // Guardar la fecha de envío
                    alert('Correo enviado al director con éxito.');
                })
                .catch((error) => {
                    console.error('Error al enviar el correo al director:', error);
                    alert('Hubo un problema al enviar el correo.');
                });
        } else {
            alert('Por favor, seleccione una fecha y hora.');
        }
    }

}
