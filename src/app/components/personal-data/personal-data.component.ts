import { Component } from '@angular/core';
import {ActivatedRoute, Router } from '@angular/router';
import {ConsultasService} from "../../services/consultas.service";
import {LoginService} from "../../services/login.service";

@Component({
  selector: 'app-personal-data',
  templateUrl: './personal-data.component.html',
  styleUrls: ['./personal-data.component.css']
})
export class PersonalDataComponent {
  selectedDocument: string = 'cedula';
  birthdate: string | null = null;
  utpldate: string | null = null;
  hasDisability: boolean = false;
  disabilityType: string = '';
  disabilityPercentage: number | null = null;
  identificacion:string = '';
  firstName: string = '';
  lastName: string = '';
  gender: string = 'masculino';
  nationality: string = '';
  idPhoto: File | null = null;
  idDocPhoto: File | null = null;
  idDiscPhoto: File | null = null;
  address: string = '';
  city: string = '';
  utplEmail: string = '';
  personalEmail: string = '';
  postalCode: number| null = null;
  country: string = 'ecuador';
  province: string = '';
  landline: string = '';
  mobile: string = '';
  laborActivity: string = '';
  hasScholarship: boolean = false;
  scholarshipPercentage: number | null = null;

  userRole: string | null = null;
  idDocPhotoURL: string | null = null;


  tesisId: string | null = null;

  constructor(private router: Router,
              private loginService: LoginService,
              private consultasService: ConsultasService,
              private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.tesisId = params['tesisId'];
    });

    this.loginService.getCurrentUser().subscribe(user => {
      if (user) {
        this.userRole = user.role;

        if (this.tesisId) {
          this.consultasService.getTesisData(this.tesisId).subscribe(data => {
            if (data) {
              this.selectedDocument = data.selectedDocument || this.selectedDocument;
              this.birthdate = data.birthdate || this.birthdate;
              this.utpldate = data.utpldate || this.utpldate;
              this.identificacion = data.identificacion || this.identificacion;
              this.firstName = data.firstName || this.firstName;
              this.lastName = data.lastName || this.lastName;
              this.gender = data.gender || this.gender;
              this.nationality = data.nationality || this.nationality;
              this.address = data.address || this.address;
              this.city = data.city || this.city;
              this.utplEmail = data.utplEmail || this.utplEmail;
              this.personalEmail = data.personalEmail || this.personalEmail;
              this.postalCode = data.postalCode || this.postalCode;
              this.country = data.country || this.country;
              this.province = data.province || this.province;
              this.landline = data.landline || this.landline;
              this.mobile = data.mobile || this.mobile;
              this.laborActivity = data.laborActivity || this.laborActivity;
              this.hasDisability = data.hasDisability || false;
              this.disabilityType = data.disabilityType || '';
              this.disabilityPercentage = data.disabilityPercentage || null;
              this.hasScholarship = data.hasScholarship || false;
              this.scholarshipPercentage = data.scholarshipPercentage || null;
            }
          });
        }
      } else {
        console.error('No se encontró el usuario autenticado.');
      }
    });
  }

  toggleDisabilityFields() {
    if (!this.hasDisability) {
      this.disabilityType = '';
      this.disabilityPercentage = null;
    }
  }

  toggleScholarshipFields() {
    if (!this.hasScholarship) {
      this.scholarshipPercentage = null; // Si no tiene beca, se resetea el valor
    }
  }

  onIdentificacionInput(event: any) {
    if (this.selectedDocument === 'cedula') {
      const input = event.target as HTMLInputElement;
      input.value = input.value.replace(/[^0-9]/g, '');
      this.identificacion = input.value;
    }
  }


  finalize() {
    if (this.isValid()) {
      if (!this.tesisId) {
        console.error("Tesis ID no está disponible.");
        return; // Evita la ejecución si tesisId es null
      }

      this.loginService.getCurrentUser().subscribe(user => {
        if (user) {
          const userId = user.id;

          // Subir imágenes a Firebase Storage
          const uploadTasks: Promise<string | null>[] = [];

          if (this.idPhoto) {
            uploadTasks.push(this.consultasService.uploadImage(userId, this.idPhoto, 'idPhotos').toPromise().then(url => url ?? null));
          }

          if (this.idDocPhoto) {
            uploadTasks.push(this.consultasService.uploadImage(userId, this.idDocPhoto, 'idDocs').toPromise().then(url => url ?? null));
          }

          if (this.idDiscPhoto && this.hasDisability) {
            uploadTasks.push(this.consultasService.uploadImage(userId, this.idDiscPhoto, 'disabilities').toPromise().then(url => url ?? null));
          }

          // Esperar a que todas las imágenes se suban y obtener las URLs
          Promise.all(uploadTasks).then((downloadURLs) => {
            let personalData: any = {
              selectedDocument: this.selectedDocument,
              birthdate: this.birthdate,
              utpldate: this.utpldate,
              firstName: this.firstName,
              lastName: this.lastName,
              gender: this.gender,
              nationality: this.nationality,
              address: this.address,
              identificacion: this.identificacion,
              city: this.city,
              utplEmail: this.utplEmail,
              personalEmail: this.personalEmail,
              postalCode: this.postalCode,
              country: this.country,
              province: this.province,
              landline: this.landline,
              mobile: this.mobile,
              laborActivity: this.laborActivity,
              hasDisability: this.hasDisability,
              disabilityType: this.disabilityType,
              disabilityPercentage: this.disabilityPercentage,
              hasScholarship: this.hasScholarship,
              scholarshipPercentage: this.scholarshipPercentage,
              idPhotoURL: downloadURLs[0] || null,
              idDocPhotoURL: downloadURLs[1] || null,
              idDiscPhotoURL: downloadURLs[2] || null
            };

            // Filtrar propiedades undefined
            personalData = Object.fromEntries(
              Object.entries(personalData).filter(([_, v]) => v !== undefined)
            );

            // Guardar los datos personales como subcolección en la colección de tesis
            this.consultasService.saveTesisData(this.tesisId!, personalData).then(() => {
              this.router.navigate(['/docs'], { queryParams: { tesisId: this.tesisId } });
            }).catch(error => {
              console.error("Error al guardar los datos personales en la tesis: ", error);
            });
          }).catch(error => {
            console.error("Error al subir las imágenes: ", error);
          });
        }
      });
    }
  }





  onFileSelected(event: any, field: 'idPhoto' | 'idDocPhoto' | 'idDiscPhoto') {
    const file: File = event.target.files[0];
    if (file) {
      this[field] = file; // Asigna el archivo al campo correspondiente (idPhoto, idDocPhoto, idDiscPhoto)
    }
  }




  isValid(): boolean {
    return (
      this.selectedDocument !== '' &&
      this.identificacion !== '' &&
      this.firstName !== '' &&
      this.lastName !== '' &&
      this.gender !== '' &&
      this.nationality !== '' &&
      this.address !== '' &&
      this.city !== '' &&
      this.utplEmail !== '' &&
      this.personalEmail !== '' &&
      this.postalCode !== null &&
      this.country !== '' &&
      this.province !== '' &&
      this.landline !== '' &&
      this.mobile !== '' &&
      (this.hasDisability ? (this.disabilityType !== '' && this.disabilityPercentage !== null) : true) &&
      (this.hasScholarship ? this.scholarshipPercentage !== null : true)
    );
  }

}
