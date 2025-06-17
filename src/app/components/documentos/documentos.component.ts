import { Component, OnInit } from '@angular/core';
import { ConsultasService } from '../../services/consultas.service';
import { LoginService } from '../../services/login.service';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import {ActivatedRoute} from "@angular/router";
import {AlertaService} from "../../services/alert.service";

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
    file: null,
    fechaValidacionActual: null,
  };
  addingDocument = false;
  currentUserId: string = '';
  tesisId: string | null = null;
  role: string = '';

  constructor(private consultasService: ConsultasService, private loginService: LoginService,
              private route: ActivatedRoute) {}

  ngOnInit() {
    // Obtener el parámetro tesisId de los queryParams
    this.route.queryParams.subscribe(params => {
      this.tesisId = params['tesisId'];
      console.log('Tesis ID:', this.tesisId);

      if (this.tesisId) {  // Verificación para evitar el uso de null
        this.loadDocuments();
        this.loadPersonalData();
      } else {
        console.error('No se encontró el ID de la tesis.');
      }
    });

    this.loginService.getCurrentUser().subscribe(user => {
      if (user) {
        this.currentUserId = user.id;
        this.role = user.role;
        if (this.tesisId) {  // Verificación para evitar el uso de null
          this.loadDocuments();
          this.loadPersonalData();
        }
      }
    });
  }

  getStatusClass(status: string): string {
    if (status === 'Aprobado') {
      return 'status-approve';
    } else if (status === 'Rechazado') {
      return 'status-reject';
    } else {
      return 'status-wait';
    }
  }



  // Cargar documentos desde la subcolección 'documents' de la tesis
  loadDocuments() {
    if (this.tesisId) {
      this.consultasService.getDocumentsByTesisId(this.tesisId).subscribe((docs) => {
        this.documents = docs.map(doc => ({
          ...doc,
          estadoActual: doc[this.role] || 'En espera', // Estado actual según el rol
          observacionesActual: doc.observaciones || '', // Observaciones
          fechaValidacionActual: this.role === 'director' ? doc.fechaValidacion || null : doc.fechaValidacion, // Fecha para director
        }));
      });
    }
  }



  addDocument() {
    this.addingDocument = true;
  }

  loadPersonalData() {
    if (this.tesisId) {  // Verifica que el tesisId esté disponible
      this.consultasService.getPersonalDataFromTesis(this.tesisId).subscribe((data) => {
        if (data) {
          this.personalData = data;
        } else {
          console.error('No se encontraron datos personales en la tesis.');
        }
      }, error => {
        console.error('Error al cargar los datos personales:', error);
      });
    } else {
      console.error('No se pudo cargar la información personal porque no se encontró el ID de la tesis.');
    }
  }


  onFileSelected(event: any) {
    this.newDocument.file = event.target.files[0];
  }

  // Confirmar y guardar un nuevo documento en la tesis
  confirmDocument() {
    if (this.newDocument.descripcion && this.newDocument.fechaIngreso && this.newDocument.file) {
      if (this.tesisId) {  // Verificación de que la tesisId no sea null
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

            this.consultasService.saveDocumentInTesis(this.tesisId!, documentData).then(() => {
              this.documents.push(documentData);
              this.newDocument = { descripcion: '', fechaIngreso: null, file: null };
              this.addingDocument = false;
            }).catch(error => {
              console.error('Error al guardar el documento: ', error);
            });
          }
        });
      } else {
        console.error('No se encontró el ID de la tesis para asociar el documento.');
      }
    }
  }



  printDocument() {
    const doc = new jsPDF();

    if (!this.personalData) {
      console.error('No se encontraron datos personales.');
      return;
    }

    // Título
    doc.setFontSize(18);
    doc.text('VISOR 360 DOCENTE - ESTUDIANTE', 10, 10);

    // Información personal extraída del objeto personalData dentro de la tesis
    doc.setFontSize(12);
    const firstName = this.personalData?.firstName || 'Nombre no disponible';
    const lastName = this.personalData?.lastName || 'Apellido no disponible';
    const email = this.personalData?.utplEmail || 'Email no disponible';
    const mobile = this.personalData?.mobile || 'Contacto no disponible';

    doc.text(`Nombre: ${firstName} ${lastName}`, 10, 20);
    doc.text(`Correo: ${email}`, 10, 30);
    doc.text(`Contacto: ${mobile}`, 10, 40);
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

  updateDocumentStates() {
    const documentosActualizados = this.documents.map(doc => ({
      id: doc.id,
      [`${this.role}`]: doc.estadoActual, // Guardar estado según el rol
      observaciones: this.role === 'docente' ? doc.observacionesActual : doc.observaciones,
      fechaValidacion: this.role === 'director' ? doc.fechaValidacionActual : doc.fechaValidacion,
    }));

    // Verificar si hay documentos sin estado seleccionado
    if (documentosActualizados.some(doc => !doc[this.role])) {
      alert("Todos los documentos deben tener un estado.");
      return;
    }

    // Si es director, validar que todas las fechas de validación estén seleccionadas
    if (this.role === 'director' && documentosActualizados.some(doc => !doc.fechaValidacion)) {
      alert("Debe seleccionar una fecha de validación para todos los documentos.");
      return;
    }

    this.consultasService.updateDocumentsStates(this.tesisId!, documentosActualizados)
      .then(() => {



        alert("Estados actualizados correctamente.");
        this.loadDocuments(); // Recargar documentos
      })
      .catch(error => {
        console.error('Error al actualizar estados:', error);
      });
  }



}
