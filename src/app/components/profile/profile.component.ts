import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ConsultasService } from '../../services/consultas.service';
import Class from '../../interfaces/classes.interface';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  selectedClass: Class | null = null;
  professorName: string = '';
  subjectDescription: string = '';
  currentQuestionIndex: number = 0;
  questions: string[] = ['¿Pregunta 1?', '¿Pregunta 2?', '¿Pregunta 3?'];
  buttonText: string = 'Siguiente';

  constructor(
    private route: ActivatedRoute,
    private consultasService: ConsultasService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const classId = params['classId'];
      if (classId) {
        this.loadClassDetails(classId);
      }
    });
  }

  loadClassDetails(classId: string): void {
    this.consultasService.getClassById(classId).subscribe(classData => {
      if (classData) {
        this.selectedClass = classData;
        this.professorName = classData.professorName;
        this.subjectDescription = classData.description; // Asegúrate de agregar el campo description a la interfaz Class
      }
    });
  }

  nextQuestion(): void {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
    } else {
      this.buttonText = 'Finalizar';
    }
  }
}
