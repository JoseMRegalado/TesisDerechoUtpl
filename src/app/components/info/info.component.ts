import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from '../../services/login.service';
import { ConsultasService } from '../../services/consultas.service';
import {catchError, forkJoin, Observable, of, take, throwError} from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import Class from '../../interfaces/classes.interface';
import autoTable from "jspdf-autotable";
import {jsPDF} from "jspdf";
import * as XLSX from 'xlsx'; // Importar la librería xlsx

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.css']
})
export class InfoComponent implements OnInit {
  userRole: string | null = null;
  availableRoles: string[] = [];
  selectedRole: string | null = null;
  selectedModality: string | null = null;
  selectedClass: string | null = null;

  filteredClasses$: Observable<(Class & { professorName: string })[]> | null = null;
  isCreatingTesis = false;

  tesisList: any[] = []; // Lista completa de tesis
  filteredTesis: any[] = []; // Lista filtrada según el buscador
  searchTerm: string = '';


  selectedFile: File | null = null;
  isLoading = false;
  feedbackMessage = '';
  isError = false;

  // Nueva propiedad para el rol seleccionado en el <select>
  selectedRoleForUpload: 'director' | 'equipo evaluador' | null = null;


  cycles: any[] = [];
  selectedCycleId: string = '';

  constructor(
    private loginService: LoginService,
    private consultasService: ConsultasService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginService.getCurrentUser().subscribe(user => {
      if (user) {
        this.userRole = user.role;

        if (user.role === 'estudiante') {
          this.availableRoles = ['estudiante'];
        } else if (['secretario', 'director', 'docente'].includes(user.role)) {
          this.availableRoles = ['secretario', 'director', 'docente'];
          this.loadTesis();
        }
      } else {
        console.error('No se encontró el usuario autenticado.');
      }
    });
    this.consultasService.getCycles().subscribe(cycles => {
      this.cycles = cycles;
    });
  }


  onModalityChange(modality: string): void {
    this.selectedModality = modality;
    this.filteredClasses$ = this.consultasService.getClassesByModality(modality);
  }

  isButtonEnabled(): boolean {
    return this.selectedCycleId !== null && this.selectedClass !== null && !this.isCreatingTesis;
  }

  goToProfile(): void {
    if (!this.isButtonEnabled()) {
      console.warn('Botón deshabilitado. Verifica selecciones.');
      return; // Sale si el botón no está habilitado
    }

    this.isCreatingTesis = true; // Bloquea el botón

    // 1. Obtener usuario actual, directores y todas las tesis existentes
    forkJoin({
      user: this.loginService.getCurrentUser().pipe(take(1)), // Tomar solo el primer valor para evitar problemas con forkJoin
      directors: this.consultasService.getUserByRole('director').pipe(take(1)),
      allTesis: this.consultasService.getAllTesis().pipe(take(1)),
      // También necesitamos los datos de la clase seleccionada
      classData: this.selectedClass ? this.consultasService.getClassById(this.selectedClass).pipe(take(1)) : of(null)
    }).pipe(
      switchMap(results => {
        const { user, directors, allTesis, classData } = results;

        // Validaciones
        if (!user) {
          return throwError(() => new Error('Usuario no autenticado.'));
        }
        if (!classData) {
          return throwError(() => new Error('No se pudieron obtener los datos de la clase seleccionada.'));
        }
        if (!directors || directors.length === 0) {
          return throwError(() => new Error('No hay directores disponibles para asignar.'));
        }

        // 2. Calcular el director a asignar
        const totalTesis = allTesis.length;
        const totalDirectors = directors.length;
        const directorIndex = Math.floor(totalTesis / 7) % totalDirectors;
        const assignedDirector = directors[directorIndex]; // Asegúrate que getUserByRole devuelva objetos User con id, firstName, lastName

        if (!assignedDirector || !assignedDirector.id || !assignedDirector.firstName) {
          return throwError(() => new Error('Director seleccionado inválido o le faltan datos (id, firstName, lastName).'));
        }

        const cicloSeleccionado = this.cycles.find(c => c.id === this.selectedCycleId);
        const cicloName = cicloSeleccionado ? cicloSeleccionado.name : '';

        // 3. Preparar datos de la nueva tesis
        const tesisData = {
          studentName: `${user.firstName} ${user.lastName}`,
          userId: user.id, // ID del estudiante
          className: classData.name,
          classId: classData.id, // Guarda el ID de la clase también si es útil
          professorName: classData.professorName, // Profesor de la clase
          directorId: assignedDirector.id, // ID del director asignado
          directorEmail: assignedDirector.email,
          directorName: `${assignedDirector.firstName} ${assignedDirector.lastName}`, // Nombre del director asignado
          status: 'Faltante', // Estado inicial
          progress: 0, // Progreso inicial
          Facultad: 'Facultad de Ciencias Jurídicas y Políticas', // Puedes hacerlo dinámico si es necesario
          Carrera: 'Derecho', // Puedes hacerlo dinámico si es necesario
          createdAt: new Date(), // Fecha de creación
          ciclo: cicloName,
          // Agrega cualquier otro campo inicial necesario
        };

        // 4. Guardar la nueva tesis
        return this.consultasService.saveTesis(tesisData);
      }),
      catchError(error => {
        // Manejo centralizado de errores de la cadena
        console.error('Error en el proceso de creación de tesis:', error);
        this.isCreatingTesis = false; // Desbloquea el botón en caso de error
        // Podrías mostrar un mensaje al usuario aquí
        alert(`Error al crear la tesis: ${error.message || error}`);
        return of(null); // Devuelve un observable nulo para que la subscripción no falle
      })
    ).subscribe({
      next: (tesisId) => {
        if (tesisId) { // Solo navega si se obtuvo un ID de tesis válido
          console.log('Tesis creada con ID:', tesisId);
          this.router.navigate(['/profile'], { queryParams: { tesisId: tesisId } });
        }
        // Si tesisId es null (por el catchError), no navega pero ya se manejó el error.
        this.isCreatingTesis = false; // Desbloquea el botón al completar (éxito o error manejado)
      },
      // El bloque error del subscribe ya no es estrictamente necesario si usamos catchError bien,
      // pero lo dejamos por si acaso.
      error: (error) => {
        // Este error solo se alcanzaría si hay un problema en la navegación o algo después del catchError
        console.error('Error final inesperado:', error);
        this.isCreatingTesis = false;
      }
    });
  }

  loadTesis(): void {
    this.consultasService.getAllTesis().subscribe(tesis => {
      this.tesisList = tesis;
      this.filteredTesis = tesis; // Inicialmente, muestra todas las tesis
    });
  }

  onSearch(): void {
    const searchTermLower = this.searchTerm.toLowerCase();
    this.filteredTesis = this.tesisList.filter(tesis =>
      tesis.studentName.toLowerCase().includes(searchTermLower) ||
      tesis.userId.toLowerCase().includes(searchTermLower)
    );
  }

  goToTracking(tesisId: string): void {
    this.router.navigate(['/personal'], { queryParams: { tesisId } });
  }

  downloadPDF(): void {
    const doc = new jsPDF();

    doc.text('Seguimiento de Tesis', 14, 10);

    autoTable(doc, {
      startY: 20,
      head: [['Nombre del estudiante', 'Docente', 'Facultad', 'Carrera', 'Identificación', 'Asignatura', 'Estado', 'Avance']],
      body: this.filteredTesis.map(tesis => [
        tesis.studentName, tesis.professorName, 'Facultad de Ciencias Jurídicas y Políticas', 'Derecho', tesis.userId,
        tesis.className, tesis.status, `${tesis.progress}%`
      ]),
      theme: 'striped',
      styles: { fontSize: 10 }
    });

    doc.save('seguimiento_tesis.pdf');
  }


  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validar tipo de archivo si es necesario
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        this.selectedFile = file;
        this.feedbackMessage = ''; // Limpiar mensaje anterior
        this.isError = false;
      } else {
        this.selectedFile = null;
        this.feedbackMessage = 'Error: Por favor, selecciona un archivo Excel (.xlsx o .xls).';
        this.isError = true;
      }
    }
  }

  processExcelFile(): void {
    // Validaciones iniciales (archivo y rol seleccionados)
    if (!this.selectedFile) {
      this.feedbackMessage = 'Error: No hay archivo seleccionado.';
      this.isError = true;
      return;
    }
    if (!this.selectedRoleForUpload) {
      this.feedbackMessage = 'Error: Debes seleccionar un rol para asignar a los usuarios.';
      this.isError = true;
      return; // Detener si no se ha seleccionado rol
    }

    this.isLoading = true;
    this.feedbackMessage = 'Leyendo archivo...';
    this.isError = false;
    const reader = new FileReader();

    reader.onload = (e: any) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (!jsonData || jsonData.length === 0) {
          throw new Error("El archivo Excel está vacío o no tiene el formato esperado.");
        }

        this.feedbackMessage = `Archivo leído. Procesando ${jsonData.length} registros para el rol: ${this.selectedRoleForUpload}...`;

        const requiredColumns = ['nombre', 'apellido', 'email'];
        const firstRow = jsonData[0];
        for (const col of requiredColumns) {
          if (!(col in firstRow)) {
            throw new Error(`Falta la columna requerida: '${col}' en el archivo Excel.`);
          }
        }

        // Usar el rol seleccionado del <select>
        const roleToAssign = this.selectedRoleForUpload;

        const usersToCreate = jsonData.map(row => {
          // Validar que los campos no estén vacíos en la fila actual
          if (!row.nombre || !row.apellido || !row.email) {
            console.warn(`Fila omitida por datos faltantes: ${JSON.stringify(row)}`);
            // Puedes lanzar un error o simplemente omitir la fila
            return null; // Marcar para filtrar después
          }
          return {
            firstName: String(row.nombre).trim(),
            lastName: String(row.apellido).trim(),
            email: String(row.email).trim().toLowerCase(),
            role: roleToAssign // Asignar el rol seleccionado
            // El campo 'id' será añadido por el servicio addUser
          };
        }).filter(user => user !== null); // Filtrar filas marcadas como nulas (omitidas)

        if (usersToCreate.length === 0) {
          throw new Error("No se encontraron filas válidas con datos completos en el archivo.");
        }

        this.feedbackMessage = `Datos validados. Guardando ${usersToCreate.length} usuarios con rol '${roleToAssign}'...`;
        this.saveUsersBatch(usersToCreate); // Llama a guardar

      } catch (error: any) {
        this.feedbackMessage = `Error al procesar el archivo: ${error.message}`;
        this.isError = true;
        this.isLoading = false;
      }
    };
    reader.onerror = (error) => {
      this.feedbackMessage = `Error al leer el archivo: ${error}`;
      this.isError = true;
      this.isLoading = false;
    };
    reader.readAsBinaryString(this.selectedFile);
  }

  // saveUsersBatch sigue siendo igual, llamará al método addUser actualizado
  async saveUsersBatch(users: any[]): Promise<void> {
    this.feedbackMessage = `Guardando ${users.length} usuarios en Firestore...`;
    let successCount = 0;
    let errorCount = 0;
    const errorMessages: string[] = [];

    const promises = users.map(user =>
      this.consultasService.addUser(user) // Llama al método addUser actualizado
        .then(() => successCount++)
        .catch(error => { // El error relanzado desde addUser se captura aquí
          errorCount++;
          // Usar el mensaje de error formateado desde addUser
          errorMessages.push(error.message || `Error desconocido procesando ${user.email}`);
        })
    );

    try {
      await Promise.all(promises);

      this.feedbackMessage = `Proceso completado. ${successCount} usuarios guardados. ${errorCount} errores.`;
      if (errorCount > 0) {
        this.isError = true;
        this.feedbackMessage += `\n--- Detalles de errores ---\n${errorMessages.join('\n')}`;
        console.error("Errores detallados:", errorMessages);
      } else {
        this.isError = false;
      }
    } catch (finalError: any) {
      this.feedbackMessage = `Error inesperado durante el guardado: ${finalError.message}`;
      this.isError = true;
    } finally {
      this.isLoading = false;
      this.selectedFile = null;
      // Resetear el input file si es necesario
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      // No resetear el rol seleccionado para facilitar cargas múltiples con el mismo rol
      // this.selectedRoleForUpload = null;
    }
  }




}
