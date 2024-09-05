import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { LoginService } from '../../services/login.service';
import { ConsultasService } from '../../services/consultas.service';
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

  constructor(private loginService: LoginService, private consultasService: ConsultasService,private router: Router) {}

  ngOnInit(): void {
    this.loginService.getCurrentUser().subscribe(user => {
      if (user) {
        this.availableRoles = this.getRolesForUser(user.role);  // Filtra los roles disponibles según el usuario
      }
    });
  }

  getRolesForUser(userRole: string): string[] {
    // Filtra los roles según el rol del usuario loggeado
    const roles = ['estudiante', 'secretario', 'director', 'docente'];
    return roles.filter(role => role === userRole); // Solo muestra el rol del usuario
  }

  onModalityChange(modality: string): void {
    this.selectedModality = modality;

    // Consulta las clases según la modalidad
    this.filteredClasses$ = this.consultasService.getClassesByModality(modality);
  }

  isButtonEnabled(): boolean {
    return this.selectedRole !== null && this.selectedClass !== null;
  }

  // Redirigir al componente de perfil con la clase seleccionada
  goToProfile(): void {
    if (this.isButtonEnabled()) {
      this.router.navigate(['/profile'], { queryParams: { classId: this.selectedClass } });
    }
  }
}
