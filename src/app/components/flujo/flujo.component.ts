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
  mostrarDialogoReunion: boolean = false;  // Controla el modal de reuniones
  reunionForm: any = {};  // Formulario para la reunión
  reuniones: any[] = []; // ← Agregar esta línea
  fechaRegistroReunion: string | null = null;
  documentoReunion: File | null = null;  // Archivo seleccionado para la reunión
  ultimoPorcentajeEstudiante: number = 0;
  ultimoPorcentajeDirector: number = 0;



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
            this.cargarReuniones();
          } else {
            console.log("No hay usuario loggeado.");
          }
        });
      } else {
        console.error('No se encontró el ID de la tesis.');
      }
    });


  }

  cargarEvidencias() {
    if (this.usuarioLoggeado && this.tesisId) {
      this.firestore.collection('tesis').doc(this.tesisId)
        .collection('flujo')
        .valueChanges()
        .subscribe((data: any[]) => {
          this.evidencias = data;
          console.log("Evidencias cargadas:", this.evidencias);
          this.obtenerUltimosPorcentajes(); // Asegurar que se recalculan los porcentajes
        }, error => console.error('Error al cargar evidencias:', error));
    }
  }


  obtenerUltimosPorcentajes() {
    if (!this.evidencias || this.evidencias.length === 0) {
      console.log("⚠️ No hay evidencias registradas.");
      this.ultimoPorcentajeEstudiante = 0;
      this.ultimoPorcentajeDirector = 0;
      return;
    }

    console.log("🔎 Filtrando evidencias...");

    // Filtrar evidencias de estudiantes
    const evidenciasEstudiante = this.evidencias.filter(e => e.rol === 'estudiante' && e.porcentaje != null);
    this.ultimoPorcentajeEstudiante = evidenciasEstudiante.length
      ? Math.max(...evidenciasEstudiante.map(e => Number(e.porcentaje) || 0))
      : 0;

    console.log("🎓 Último porcentaje estudiante:", this.ultimoPorcentajeEstudiante);

    // Filtrar evidencias de directores
    const evidenciasDirector = this.evidencias.filter(e => e.rol === 'director' && e.porcentaje != null);
    this.ultimoPorcentajeDirector = evidenciasDirector.length
      ? Math.max(...evidenciasDirector.map(e => Number(e.porcentaje) || 0))
      : 0;

    console.log("📋 Último porcentaje director:", this.ultimoPorcentajeDirector);
  }






  // Abre el modal para agregar nueva evidencia
  openAddDialog() {
    this.mostrarDialogoAgregar = true;
    this.form.fechaRegistro = new Date().toISOString().split('T')[0]; // Asigna la fecha actual en formato YYYY-MM-DD
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
    console.log('Archivo seleccionado:', this.documento);
  }


  // Método para enviar el formulario de agregar nueva evidencia
  submit() {
    if (!this.documento || !this.tesisId || !this.usuarioLoggeado) return;
    if (!this.form.fechaRegistro || !this.form.descripcion || !this.form.bimestre || this.form.porcentaje == null) return;

    const esEstudiante = this.usuarioLoggeado.role === 'estudiante';
    const esDirector = this.usuarioLoggeado.role === 'director';

    if (esEstudiante && this.form.porcentaje <= this.ultimoPorcentajeEstudiante) {
      alert(`El porcentaje debe ser mayor a ${this.ultimoPorcentajeEstudiante}%`);
      return;
    }

    if (esDirector && this.form.porcentaje <= this.ultimoPorcentajeDirector) {
      alert(`El porcentaje debe ser mayor a ${this.ultimoPorcentajeDirector}%`);
      return;
    }

    const filePath = `flujo/${this.usuarioLoggeado.firstName}_${this.usuarioLoggeado.lastName}/${this.documento.name}`;
    const fileRef = this.storage.ref(filePath);
    const uploadTask = this.storage.upload(filePath, this.documento);

    uploadTask.then(() => {
      fileRef.getDownloadURL().subscribe(downloadUrl => {
        const nuevaEvidencia = {
          periodo: 'Oct/2023 - Feb/2024',
          bimestre: this.form.bimestre,
          fechaRegistro: this.form.fechaRegistro,
          descripcion: this.form.descripcion,
          evidenciaUrl: downloadUrl,
          porcentaje: this.form.porcentaje,
          usuarioNombre: this.usuarioLoggeado?.firstName,
          usuarioApellido: this.usuarioLoggeado?.lastName,
          usuarioId: this.usuarioLoggeado?.id,
          comentario: this.form.comentario,
          rol: this.usuarioLoggeado?.role
        };

        this.firestore.collection('tesis').doc(this.tesisId!)
          .collection('flujo')
          .add(nuevaEvidencia)
          .then(() => {
            this.cerrarDialogo();
            this.cargarEvidencias();
          });
      });
    });
  }


  // Abrir el modal de reuniones y asignar la fecha de registro actual
  openReunionDialog() {
    this.fechaRegistroReunion = new Date().toISOString();
    this.mostrarDialogoReunion = true;
  }

  cerrarReunionDialog() {
    this.mostrarDialogoReunion = false;
    this.reunionForm = {};
  }

  cargarReuniones() {
    if (this.tesisId) {
      this.firestore.collection('tesis').doc(this.tesisId).collection('reuniones')
        .valueChanges({ idField: 'id' }) // Agregar el ID de Firestore
        .subscribe((data: any[]) => {
          this.reuniones = data;
        }, error => {
          console.error('❌ Error al cargar reuniones:', error);
        });
    }
  }

  actualizarAsistencia(reunion: any) {
    if (this.usuarioLoggeado?.firstName + ' ' + this.usuarioLoggeado?.lastName !== reunion.autor) {
      console.warn('❌ No tienes permiso para actualizar esta asistencia.');
      return;
    }

    this.firestore.collection('tesis').doc(this.tesisId!)
      .collection('reuniones').doc(reunion.id)
      .update({ asistencia: reunion.asistencia })
      .then(() => console.log('✅ Asistencia actualizada'))
      .catch(error => console.error('❌ Error al actualizar asistencia:', error));
  }

  onFileSelectedReunion(event: any) {
    this.documentoReunion = event.target.files[0];
    console.log('Archivo de reunión seleccionado:', this.documentoReunion);
  }



  // Método para enviar el formulario de reunión
  submitReunion() {
    if (!this.tesisId) {
      console.error('❌ No hay ID de tesis disponible.');
      return;
    }
    if (!this.usuarioLoggeado) {
      console.error('❌ No hay usuario loggeado.');
      return;
    }
    if (!this.reunionForm.descripcion || !this.reunionForm.fechaReunion) {
      console.error('❌ Todos los campos son obligatorios.');
      return;
    }

    const nuevaReunion = {
      periodo: 'Oct/2023 - Feb/2024',
      fechaRegistro: this.fechaRegistroReunion,
      fechaReunion: this.reunionForm.fechaReunion,
      descripcion: this.reunionForm.descripcion,
      asistencia: 'Pendiente',
      autor: `${this.usuarioLoggeado.firstName} ${this.usuarioLoggeado.lastName}`,
      evidenciaUrl: ''  // Inicialmente vacío
    };

    if (this.documentoReunion) {
      const filePath = `reuniones/${this.usuarioLoggeado.firstName}_${this.usuarioLoggeado.lastName}/${this.documentoReunion.name}`;
      const fileRef = this.storage.ref(filePath);
      const uploadTask = this.storage.upload(filePath, this.documentoReunion);

      uploadTask.then(() => {
        fileRef.getDownloadURL().subscribe((downloadUrl) => {
          nuevaReunion.evidenciaUrl = downloadUrl;

          this.firestore.collection('tesis').doc(this.tesisId!)
            .collection('reuniones')
            .add(nuevaReunion)
            .then(() => {
              console.log('✅ Reunión guardada con éxito con evidencia');
              this.cerrarReunionDialog();
              this.cargarReuniones();
            })
            .catch(error => console.error('❌ Error al guardar la reunión:', error));
        });
      }).catch(error => console.error('❌ Error al subir archivo:', error));
    } else {
      this.firestore.collection('tesis').doc(this.tesisId!)
        .collection('reuniones')
        .add(nuevaReunion)
        .then(() => {
          console.log('✅ Reunión guardada con éxito sin evidencia');
          this.cerrarReunionDialog();
          this.cargarReuniones();
        })
        .catch(error => console.error('❌ Error al guardar la reunión:', error));
    }
  }


  visualizarRubrica() {
    // Lógica para visualizar la rúbrica (puede ser una redirección, un modal, etc.)
    console.log("Mostrando rúbrica...");
  }


}
