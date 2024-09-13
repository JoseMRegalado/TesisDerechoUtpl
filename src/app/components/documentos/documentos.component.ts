import { Component, OnInit } from '@angular/core';
import { ConsultasService } from '../../services/consultas.service';
import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-documentos',
  templateUrl: './documentos.component.html',
  styleUrls: ['./documentos.component.css']
})
export class DocumentosComponent implements OnInit {
  documents: any[] = [];
  newDocument: any = {
    descripcion: '',
    fechaIngreso: null,
    file: null
  };
  addingDocument = false;
  currentUserId: string = '';

  constructor(private consultasService: ConsultasService, private loginService: LoginService) {}

  ngOnInit() {
    // Obtén el usuario loggeado y carga sus documentos
    this.loginService.getCurrentUser().subscribe(user => {
      if (user) {
        this.currentUserId = user.id;
        this.loadDocuments();
      }
    });
  }

  // Método para cargar los documentos del usuario actual
  loadDocuments() {
    this.consultasService.getDocumentsByUser(this.currentUserId).subscribe((docs) => {
      this.documents = docs;
    });
  }

  addDocument() {
    this.addingDocument = true;
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
            userId: this.currentUserId  // Asociamos el documento al usuario loggeado
          };

          // Guardar el documento en Firestore
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
}
