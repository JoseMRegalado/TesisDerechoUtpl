import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ConsultasService } from '../../services/consultas.service'; // Asegúrate de importar tu servicio

@Component({
  selector: 'app-ciclo',
  templateUrl: './ciclo.component.html',
  styleUrls: ['./ciclo.component.css']
})
export class CicloComponent implements OnInit {
  tesisId: string | null = null;

  materias = {
    practicum1: '',
    practicum2: '',
    gestion1: '',
    gestion2: ''
  };

  bimestres = {
    primerBimestre: null,
    segundoBimestre: null
  };

  fechas = {
    primerAvance: '',
    segundoAvance: '',
    aprobacion1: '',
    aprobacion2: ''
  };

  constructor(private route: ActivatedRoute, private consultasService: ConsultasService) {}

  ngOnInit(): void {
    // Obtener el ID de la tesis del queryParams
    this.route.queryParams.subscribe(params => {
      this.tesisId = params['tesisId'];
      console.log('Tesis ID:', this.tesisId);
    });
  }

  guardarMaterias(): void {
    if (this.tesisId) {
      this.consultasService.updateTesis1(this.tesisId, { materias: this.materias });
    }
  }

  guardarBimestres(): void {
    if (this.tesisId) {
      this.consultasService.updateTesis1(this.tesisId, { bimestre: this.bimestres });
    }
  }

  guardarFechas(): void {
    if (this.tesisId) {
      const fechaAvances = {
        primerAvance: this.fechas.primerAvance,
        segundoAvance: this.fechas.segundoAvance,
      };
      this.consultasService.updateTesis1(this.tesisId, { fechas: fechaAvances });
    }
  }

  guardarAprobaciones(): void {
    if (this.tesisId) {
      this.consultasService.updateTesis1(this.tesisId, {fechas:{
        'Aprobacion1': this.fechas.aprobacion1,
      }});
    }
  }

  guardarAprobaciones2(): void {
    if (this.tesisId) {
      this.consultasService.updateTesis1(this.tesisId, {fechas:{
          'Aprobacion2': this.fechas.aprobacion2,
        }});
    }
  }
}
