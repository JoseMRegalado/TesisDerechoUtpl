import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConsultasService } from '../../services/consultas.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  professorName: string = '';
  subjectDescription: string = '';
  studentName: string = '';
  status: string = '';
  currentQuestionIndex: number = 0;
  questions: string[] = ['¿Pregunta 1?', '¿Pregunta 2?', '¿Pregunta 3?'];
  buttonText: string = 'Siguiente';
  currentAnswer: string = '';  // Para almacenar la respuesta actual
  tesisId: string = '';  // Guardar el ID de la tesis

  constructor(
    private route: ActivatedRoute,
    private consultasService: ConsultasService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.tesisId = params['tesisId'];  // Guardar el ID de la tesis
      if (this.tesisId) {
        this.loadTesisDetails(this.tesisId);
      }
    });
  }

  loadTesisDetails(tesisId: string): void {
    this.consultasService.getTesisById(tesisId).subscribe(tesisData => {
      if (tesisData) {
        this.studentName = tesisData.studentName;
        this.professorName = tesisData.professorName;
        this.subjectDescription = tesisData.className;
        this.status = tesisData.status;
      }
    });
  }

  saveAnswer(): void {
    // Crear el nombre del campo de respuesta dinámico (ej. question1, question2)
    const answerField = `question${this.currentQuestionIndex + 1}`;

    // Guardar la respuesta en la base de datos
    const updateData = {
      [answerField]: this.currentAnswer  // Dinámicamente guarda cada respuesta
    };

    this.consultasService.updateTesis(this.tesisId, updateData).subscribe({
      next: () => {
        console.log(`Respuesta guardada en ${answerField}:`, this.currentAnswer);
        this.currentAnswer = '';  // Limpiar el campo de respuesta
      },
      error: (error) => {
        console.error('Error al guardar la respuesta:', error);
      }
    });
  }

  nextQuestion(): void {
    // Guardar la respuesta antes de avanzar a la siguiente pregunta
    this.saveAnswer();

    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
    } else {
      this.buttonText = 'Finalizar';
      // Al finalizar, redirigir al componente /personal con el ID de la tesis
      this.router.navigate(['/personal'], { queryParams: { tesisId: this.tesisId } });
    }
  }
}
