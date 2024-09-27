import { Component, OnInit } from '@angular/core';
import { ConsultasService } from '../../services/consultas.service';
import { LoginService } from '../../services/login.service';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import {ActivatedRoute} from "@angular/router";  // Importación de autoTable

@Component({
  selector: 'app-documentos',
  templateUrl: './documentos.component.html',
  styleUrls: ['./documentos.component.css']
})
export class DocumentosComponent implements OnInit {
  documents: any[] = [];
  personalData: any = {};
  newDocument: any = {
    descripcion: '',
    fechaIngreso: null,
    file: null
  };
  addingDocument = false;
  currentUserId: string = '';
  tesisId: string | null = null;

  constructor(private consultasService: ConsultasService, private loginService: LoginService,
              private route: ActivatedRoute) {}

  ngOnInit() {
    // Obtener el parámetro tesisId de los queryParams
    this.route.queryParams.subscribe(params => {
      this.tesisId = params['tesisId'];
      console.log('Tesis ID:', this.tesisId);
      this.loadDocuments();
      this.loadPersonalData();
    });

    this.loginService.getCurrentUser().subscribe(user => {
      if (user) {
        this.currentUserId = user.id;
        this.loadDocuments();
        this.loadPersonalData();
      }
    });
  }


  loadDocuments() {
    this.consultasService.getDocumentsByUser(this.currentUserId).subscribe((docs) => {
      this.documents = docs;
    });
  }

  addDocument() {
    this.addingDocument = true;
  }

  loadPersonalData() {
    this.consultasService.getPersonalDataByUserId(this.currentUserId).subscribe((data) => {
      this.personalData = data;
    });
  }

  onFileSelected(event: any) {
    this.newDocument.file = event.target.files[0];
  }

  confirmDocument() {
    if (this.newDocument.descripcion && this.newDocument.fechaIngreso && this.newDocument.file) {
      this.consultasService.uploadImage(this.currentUserId, this.newDocument.file, 'documentos').subscribe((downloadURL) => {
        if (downloadURL) {
          const documentData = {
            descripcion: this.newDocument.descripcion,
            fechaIngreso: this.newDocument.fechaIngreso,
            link: downloadURL,
            fechaValidacion: null,
            observaciones: 'Ninguna',
            docente: 'En espera',
            director: 'En espera',
            secretario: 'En espera',
            userId: this.currentUserId
          };

          this.consultasService.saveDocument(documentData).then(() => {
            this.documents.push(documentData);
            this.newDocument = { descripcion: '', fechaIngreso: null, file: null };
            this.addingDocument = false;
          }).catch(error => {
            console.error('Error al guardar el documento: ', error);
          });
        }
      });
    }
  }

  printDocument() {
    const doc = new jsPDF();

    // Título
    doc.setFontSize(18);
    doc.text('VISOR 360 DOCENTE - ESTUDIANTE', 10, 10);

    // Información personal
    doc.setFontSize(12);
    doc.text(`Nombre: ${this.personalData.firstName} ${this.personalData.lastName}`, 10, 20);
    doc.text(`Correo: ${this.personalData.utplEmail}`, 10, 30);
    doc.text(`Contacto: ${this.personalData.mobile}`, 10, 40);
    doc.text('Docente: Tais Balcazar', 10, 50);

    // Espacio antes de la tabla
    doc.text('Documentos Subidos:', 10, 60);

    // Tabla con documentos
    const columns = ["Documento digital", "Descripción de Documento", "Fecha de ingreso", "Fecha de validación", "Observaciones", "Docente", "Director", "Secretario"];
    const rows = this.documents.map(doc => [
      'Documento',
      doc.descripcion,
      doc.fechaIngreso,
      doc.fechaValidacion || '-',
      doc.observaciones || 'Ninguna',
      doc.docente || 'En espera',
      doc.director || 'En espera',
      doc.secretario || 'En espera'
    ]);

    // Usar autoTable para generar la tabla en el PDF
    (doc as any).autoTable({
      head: [columns],
      body: rows,
      startY: 70,
    });

    // Abrir el PDF en una nueva pestaña
    window.open(doc.output('bloburl'));
  }
}
