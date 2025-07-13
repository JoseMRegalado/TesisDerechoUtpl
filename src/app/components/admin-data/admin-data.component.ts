import { Component, OnInit } from '@angular/core';
import { ConsultasService } from '../../services/consultas.service'; // Servicio para obtener datos del director
import { LoginService } from '../../services/login.service'; // Servicio de autenticación
import { EmailService } from '../../services/email.service'; // Servicio para enviar correos
import { formatDate } from '@angular/common';
import {ActivatedRoute, Router} from "@angular/router";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {AngularFireStorage} from "@angular/fire/compat/storage";

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

  usuarioActual: any = {};
  esSecretario: boolean = false;

  tesisId: string | null = null;
  directorName: string = '';

  avanceDirectorAlCien: boolean = false;


  constructor(
    private consultasService: ConsultasService,
    private loginService: LoginService,
    private emailService: EmailService,
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private route: ActivatedRoute

  ) {
    this.currentDate = formatDate(new Date(), 'yyyy-MM-dd', 'en');
  }

  ngOnInit() {
    this.initializeRecuadros(); // Puedes mantenerla aquí si siempre deben mostrarse
    this.route.queryParams.subscribe(params => {
      this.tesisId = params['tesisId'];
      if (this.tesisId) {
        this.loadTesisData();
        this.verificarAvanceDirector(); // aquí

      }
    });
    this.loginService.getCurrentUser().subscribe(user => {
      this.usuarioActual = user;
      this.esSecretario = user?.role === 'secretario';
    });
    this.loadTesisData(); // Si usas directorName
    this.verificarAvanceDirector(); // aquí


  }


  loadTesisData() {
    this.firestore
      .collection('tesis')
      .doc(this.tesisId!)
      .get()
      .subscribe(docSnap => {
        if (docSnap.exists) {
          const data = docSnap.data() as any;
          this.directorName = data.directorName || 'Nombre no disponible';
        }
      });
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

  verificarAvanceDirector() {
    this.firestore
      .collection('tesis')
      .doc(this.tesisId!)
      .collection('flujo', ref =>
        ref.where('rol', '==', 'director')
      )
      .get()
      .subscribe(querySnap => {
        if (querySnap.empty) {
          this.avanceDirectorAlCien = false;
          return;
        }

        // Buscar la evidencia con la fecha más reciente manualmente
        const evidencias = querySnap.docs.map(doc => doc.data() as any);

        const evidenciaMasReciente = evidencias.reduce((a, b) =>
          new Date(a.fechaRegistro) > new Date(b.fechaRegistro) ? a : b
        );

        this.avanceDirectorAlCien = evidenciaMasReciente.porcentaje === 100;
        console.log('📌 Porcentaje más reciente del director:', evidenciaMasReciente.porcentaje);
      });
  }



}
