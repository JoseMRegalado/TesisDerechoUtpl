import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from '../../services/login.service';
import { ConsultasService } from '../../services/consultas.service';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import Class from '../../interfaces/classes.interface';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.css']
})
export class InfoComponent implements OnInit {
  availableRoles: string[] = [];
  selectedRole: string | null = null;
  selectedModality: string | null = null;
  selectedClass: string | null = null;

  filteredClasses$: Observable<(Class & { professorName: string })[]> | null = null;
  isCreatingTesis = false;  // Bandera para evitar creación duplicada

  constructor(
    private loginService: LoginService,
    private consultasService: ConsultasService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginService.getCurrentUser().subscribe(user => {
      if (user) {
        this.availableRoles = this.getRolesForUser(user.role);
      }
    });
  }

  getRolesForUser(userRole: string): string[] {
    const roles = ['estudiante', 'secretario', 'director', 'docente'];
    return roles.filter(role => role === userRole);
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
      this.isCreatingTesis = true;  // Desactivar el botón mientras se crea la tesis

      // Obtener usuario actual
      this.loginService.getCurrentUser()
        .pipe(
          switchMap(user => {
            if (user && this.selectedClass) {
              // Obtener datos de la clase seleccionada
              return this.consultasService.getClassById(this.selectedClass!).pipe(
                switchMap(classData => {
                  if (classData) {
                    // Crear el objeto de la tesis con la información del usuario y clase
                    const tesisData = {
                      studentName: `${user.firstName} ${user.lastName}`,
                      professorName: classData.professorName,
                      className: classData.name,
                      status: 'faltante',
                      userId: user.id
                      // No se incluye personalData
                    };

                    // Crear la tesis
                    return this.consultasService.saveTesis(tesisData);
                  }
                  throw new Error('No se pudo obtener los datos de la clase.');
                })
              );
            } else {
              throw new Error('Usuario no autenticado o clase no seleccionada.');
            }
          })
        )
        .subscribe({
          next: (tesisId) => {
            // Redirigir al perfil con el ID del documento de tesis recién creado
            this.router.navigate(['/profile'], { queryParams: { tesisId: tesisId } });
            this.isCreatingTesis = false;  // Volver a activar el botón después de la creación
          },
          error: (error) => {
            console.error('Error al crear la tesis:', error);
            this.isCreatingTesis = false;  // Rehabilitar el botón si ocurre un error
          }
        });
    }
  }



}
