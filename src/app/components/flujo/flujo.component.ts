import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { LoginService } from '../../services/login.service'; // Importa el LoginService
import User from '../../interfaces/user.interface';
import { Observable } from 'rxjs';

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

  constructor(
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private loginService: LoginService  // Inyecta el LoginService
  ) {}

  ngOnInit(): void {
    // Obtener el usuario loggeado al inicializar el componente
    this.loginService.getCurrentUser().subscribe(user => {
      if (user) {
        this.usuarioLoggeado = user;  // Almacena los datos del usuario loggeado
        this.cargarEvidencias();  // Cargar evidencias relacionadas al usuario
      } else {
        console.log("No hay usuario loggeado.");
      }
    });
  }

  // Cargar evidencias desde Firestore
  cargarEvidencias() {
    if (this.usuarioLoggeado) {
      this.firestore.collection('flujo', ref => ref.where('usuarioId', '==', this.usuarioLoggeado?.id))
        .valueChanges().subscribe((data: any[]) => {
        this.evidencias = data;
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
    if (this.documento && this.form.periodo && this.form.fechaRegistro && this.form.descripcion && this.form.bimestre && this.usuarioLoggeado) {
      // Subir documento a Firebase Storage
      const filePath = `flujo/${this.usuarioLoggeado.firstName}_${this.usuarioLoggeado.lastName}/${this.documento.name}`;
      const fileRef = this.storage.ref(filePath);
      const uploadTask = this.storage.upload(filePath, this.documento);

      uploadTask.then(() => {
        fileRef.getDownloadURL().subscribe((downloadUrl) => {
          // Guardar la información de la evidencia en Firestore
          const nuevaEvidencia = {
            periodo: this.form.periodo,
            bimestre: this.form.bimestre,
            fechaRegistro: this.form.fechaRegistro,
            descripcion: this.form.descripcion,
            evidenciaUrl: downloadUrl,
            comentario: this.form.comentario,
            usuarioNombre: this.usuarioLoggeado?.firstName,
            usuarioApellido: this.usuarioLoggeado?.lastName,
            usuarioId: this.usuarioLoggeado?.id,  // ID del usuario logueado
            tesisId: '123456'  // Reemplaza con el ID de la tesis correspondiente
          };

          this.firestore.collection('flujo').add(nuevaEvidencia).then(() => {
            this.cerrarDialogo();  // Cerrar el modal después de guardar
            this.cargarEvidencias();  // Refrescar la tabla con las nuevas evidencias
          });
        });
      });
    }
  }
}
