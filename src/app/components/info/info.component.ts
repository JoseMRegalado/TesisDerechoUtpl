import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from '../../services/login.service';
import { ConsultasService } from '../../services/consultas.service';
import { Observable } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import Class from '../../interfaces/classes.interface';
import autoTable from "jspdf-autotable";
import {jsPDF} from "jspdf";

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
  }


  onModalityChange(modality: string): void {
    this.selectedModality = modality;
    this.filteredClasses$ = this.consultasService.getClassesByModality(modality);
  }

  isButtonEnabled(): boolean {
    return this.selectedRole !== null && this.selectedClass !== null && !this.isCreatingTesis;
  }

  goToProfile(): void {
    if (this.isButtonEnabled()) {
      this.isCreatingTesis = true;

      this.loginService.getCurrentUser().pipe(
        switchMap(user => {
          if (user && this.selectedClass) {
            return this.consultasService.getClassById(this.selectedClass).pipe(
              switchMap(classData => {
                if (classData) {
                  const tesisData = {
                    studentName: `${user.firstName} ${user.lastName}`,
                    professorName: classData.professorName,
                    className: classData.name,
                    status: 'faltante',
                    userId: user.id,
                    Facultad: 'Facultad de Ciencias Jurídicas y Políticas',
                    Carrera: 'Derecho'
                  };

                  return this.consultasService.saveTesis(tesisData);
                }
                throw new Error('No se pudo obtener los datos de la clase.');
              })
            );
          } else {
            throw new Error('Usuario no autenticado o clase no seleccionada.');
          }
        })
      ).subscribe({
        next: (tesisId) => {
          this.router.navigate(['/profile'], { queryParams: { tesisId: tesisId } });
          this.isCreatingTesis = false;
        },
        error: (error) => {
          console.error('Error al crear la tesis:', error);
          this.isCreatingTesis = false;
        }
      });
    }
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
}
