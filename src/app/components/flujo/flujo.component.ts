import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { LoginService } from '../../services/login.service'; // Importa el LoginService
import User from '../../interfaces/user.interface';
import { Observable } from 'rxjs';
import {ActivatedRoute} from "@angular/router";

@Component({
  selector: 'app-flujo',
  templateUrl: './flujo.component.html',
  styleUrls: ['./flujo.component.css']
})
export class FlujoComponent implements OnInit {
  evidencias: any[] = [];  // Lista de evidencias que se mostrarán en la tabla
  mostrarDialogoAgregar: boolean = false;  // Controla la visualización del modal
  usuarioLoggeado: User | null = null;  // Información del usuario loggeado
  form: any = {};  // Formulario para agregar evidencias
  documento: File | null = null;  // Archivo seleccionado para subir


  tesisId: string | null = null;
  constructor(
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private loginService: LoginService,
    private route: ActivatedRoute// Inyecta el LoginService
  ) {}

  ngOnInit(): void {

    this.route.queryParams.subscribe(params => {
      this.tesisId = params['tesisId'];
      console.log('Tesis ID:', this.tesisId);

      if (this.tesisId) {  // Verificación para evitar el uso de null
        // Obtener el usuario loggeado al inicializar el componente
        this.loginService.getCurrentUser().subscribe(user => {
          if (user) {
            this.usuarioLoggeado = user;  // Almacena los datos del usuario loggeado
            this.cargarEvidencias();  // Cargar evidencias relacionadas al usuario
          } else {
            console.log("No hay usuario loggeado.");
          }
        });
      } else {
        console.error('No se encontró el ID de la tesis.');
      }
    });


  }

  // Cargar evidencias desde Firestore
  // Cargar evidencias de la subcolección "flujo" dentro del documento de tesis actual
  cargarEvidencias() {
    if (this.usuarioLoggeado && this.tesisId) {  // Verifica que haya usuario loggeado y tesisId disponible
      this.firestore.collection('tesis').doc(this.tesisId)
        .collection('flujo', ref => ref.where('usuarioId', '==', this.usuarioLoggeado?.id))
        .valueChanges()
        .subscribe((data: any[]) => {
          this.evidencias = data;  // Asigna las evidencias recuperadas
        }, error => {
          console.error('Error al cargar evidencias:', error);
        });
    }
  }


  // Abre el modal para agregar nueva evidencia
  openAddDialog() {
    this.mostrarDialogoAgregar = true;
  }

  // Cierra el modal sin guardar datos
  cerrarDialogo() {
    this.mostrarDialogoAgregar = false;
    this.form = {};  // Resetea el formulario
    this.documento = null;  // Resetea el archivo
  }

  // Captura el archivo seleccionado
  onFileSelected(event: any) {
    this.documento = event.target.files[0];
  }

  // Método para enviar el formulario de agregar nueva evidencia
  submit() {
    if (this.documento && this.form.periodo && this.form.fechaRegistro && this.form.descripcion && this.form.bimestre && this.usuarioLoggeado && this.tesisId) {
      // Subir documento a Firebase Storage
      const filePath = `flujo/${this.usuarioLoggeado.firstName}_${this.usuarioLoggeado.lastName}/${this.documento.name}`;
      const fileRef = this.storage.ref(filePath);
      const uploadTask = this.storage.upload(filePath, this.documento);

      uploadTask.then(() => {
        fileRef.getDownloadURL().subscribe((downloadUrl) => {
          // Guardar la información de la evidencia en la subcolección "flujo" dentro del documento de tesis
          const nuevaEvidencia = {
            periodo: this.form.periodo,
            bimestre: this.form.bimestre,
            fechaRegistro: this.form.fechaRegistro,
            descripcion: this.form.descripcion,
            evidenciaUrl: downloadUrl,
            comentario: this.form.comentario,
            usuarioNombre: this.usuarioLoggeado?.firstName,
            usuarioApellido: this.usuarioLoggeado?.lastName,
            usuarioId: this.usuarioLoggeado?.id  // ID del usuario logueado
          };

          // Agregar la evidencia a la subcolección "flujo" de la tesis actual
          this.firestore.collection('tesis').doc(this.tesisId!).collection('flujo').add(nuevaEvidencia).then(() => {
            this.cerrarDialogo();  // Cerrar el modal después de guardar
            this.cargarEvidencias();  // Refrescar la tabla con las nuevas evidencias
          });
        });
      });
    }
  }

}
