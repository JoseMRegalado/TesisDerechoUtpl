import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import {Observable, combineLatest, of, finalize} from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import Class from '../interfaces/classes.interface';
import User from '../interfaces/user.interface';
import {AngularFireStorage} from "@angular/fire/compat/storage";

@Injectable({
  providedIn: 'root'
})
export class ConsultasService {

  constructor(private firestore: AngularFirestore, private storage: AngularFireStorage) {}

  // Método para obtener las clases por modalidad, con nombre del profesor
  getClassesByModality(modality: string): Observable<(Class & { professorName: string })[]> {
    return this.firestore.collection<Class>('classes', ref =>
      ref.where('type', '==', modality)
    ).valueChanges().pipe(
      switchMap(classes => {
        // Para cada clase, busca el nombre del profesor correspondiente
        const classObservables = classes.map(classItem =>
          this.firestore.collection<User>('users').doc(classItem.userId).valueChanges().pipe(
            map(user => ({
              ...classItem,
              professorName: user ? `${user.firstName} ${user.lastName}` : 'Desconocido'
            }))
          )
        );
        return classObservables.length ? combineLatest(classObservables) : of([]);
      })
    );
  }

  getClassById(classId: string): Observable<(Class & { professorName: string }) | null> {
    return this.firestore.collection<Class>('classes').doc(classId).valueChanges().pipe(
      switchMap(classData => {
        if (!classData) {
          return of(null); // Si no se encuentra la clase, devuelve null
        }

        // Buscar el nombre del profesor asociado a la clase
        return this.firestore.collection<User>('users').doc(classData.userId).valueChanges().pipe(
          map(user => ({
            ...classData,
            professorName: user ? `${user.firstName} ${user.lastName}` : 'Desconocido'
          }))
        );
      })
    );
  }

  // Método para guardar los datos personales
  savePersonalData(userId: string, personalData: any) {
    return this.firestore.collection('personalData').doc(userId).set(personalData);
  }

  // Método para subir una imagen a Firebase Storage
  uploadImage(userId: string, file: File, folder: string): Observable<string | null> {
    const filePath = `${folder}/${userId}_${file.name}`;
    const fileRef = this.storage.ref(filePath);
    const task = this.storage.upload(filePath, file);

    return new Observable<string | null>((observer) => {
      task.snapshotChanges().pipe(
        finalize(() => {
          // Una vez finalizada la subida, obtenemos la URL de descarga
          fileRef.getDownloadURL().subscribe(
            (downloadURL) => {
              observer.next(downloadURL);
              observer.complete();
            },
            (error) => {
              observer.next(null); // En caso de error, devuelve `null` en lugar de undefined
              observer.complete();
            }
          );
        })
      ).subscribe();
    });
  }

  // Método para guardar un documento en la colección 'documents'
  saveDocument(documentData: any) {
    return this.firestore.collection('documents').add(documentData);
  }

  // Método para obtener documentos de un usuario por su userId
  getDocumentsByUser(userId: string): Observable<any[]> {
    return this.firestore.collection('documents', ref => ref.where('userId', '==', userId))
      .snapshotChanges().pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as object; // Aseguramos que 'data' sea un objeto
          const id = a.payload.doc.id;
          return { id, ...data };
        }))
      );
  }

  // Método para obtener los datos personales de un usuario por su userId
  getPersonalDataByUserId(userId: string): Observable<any> {
    return this.firestore.collection('personalData').doc(userId).valueChanges();
  }

  // Método para guardar un documento en la colección 'tesis'
  // Método para guardar un documento en la colección 'tesis'
  saveTesis(tesisData: any): Observable<string> {
    return new Observable<string>(observer => {
      this.firestore.collection('tesis').add(tesisData).then(docRef => {
        observer.next(docRef.id); // Retorna el ID del documento creado
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  updateTesis(tesisId: string, updateData: any): Observable<void> {
    return new Observable<void>(observer => {
      this.firestore.collection('tesis').doc(tesisId).update(updateData)
        .then(() => {
          observer.next();
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
        });
    });
  }


  updateTesis1(tesisId: string, data: any): Promise<void> {
    console.log('Actualizando tesis con ID:', tesisId, 'con los datos:', data);
    return this.firestore.collection('tesis').doc(tesisId).update(data)
      .then(() => console.log('Datos actualizados correctamente'))
      .catch(error => console.error('Error al actualizar:', error));
  }



  // Método para obtener un documento de la colección 'tesis' por su ID
  getTesisById(tesisId: string): Observable<any> {
    return this.firestore.collection('tesis').doc(tesisId).valueChanges();
  }

  // Método para obtener documentos filtrados por tesisId
  getDocumentsByTesisId(tesisId: string): Observable<any[]> {
    return this.firestore.collection('documents', ref => ref.where('tesisId', '==', tesisId))
      .snapshotChanges().pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as object;
          const id = a.payload.doc.id;
          return { id, ...data };
        }))
      );
  }


  // Obtener usuarios por rol
  getUserByRole(role: string): Observable<any> {
    return this.firestore.collection('users', ref => ref.where('role', '==', role)).valueChanges();
  }



}
