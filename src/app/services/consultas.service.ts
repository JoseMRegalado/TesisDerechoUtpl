import { Injectable } from '@angular/core';
import {AngularFirestore, AngularFirestoreCollection, DocumentData} from '@angular/fire/compat/firestore';
import {Observable, combineLatest, of, finalize} from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import Class from '../interfaces/classes.interface';
import User from '../interfaces/user.interface';
import {AngularFireStorage} from "@angular/fire/compat/storage";
import firebase from "firebase/compat";
import DocumentReference = firebase.firestore.DocumentReference;

@Injectable({
  providedIn: 'root'
})
export class ConsultasService {
  private usersCollection: AngularFirestoreCollection<User>;
  constructor(private firestore: AngularFirestore, private storage: AngularFireStorage) {
    this.usersCollection = firestore.collection<User>('users');
  }

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


  // Método para guardar datos personales como subcolección
  savePersonalData(userId: string, personalData: any): Promise<void> {
    // Crear una subcolección llamada 'personalData' dentro del documento del usuario
    return this.firestore
      .collection('tesis')
      .doc(userId)
      .collection('personalData')
      .add(personalData) // 'add' genera un ID único para cada documento en la subcolección
      .then(() => {
        console.log("Datos personales guardados correctamente.");
      })
      .catch((error) => {
        console.error("Error al guardar los datos personales: ", error);
        throw error;
      });
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

  getTesisData(tesisId: string): Observable<any> {
    return this.firestore.collection('tesis').doc(tesisId).valueChanges().pipe(
      map((tesis: any) => tesis ? tesis.personalData : null)  // Accede a personalData directamente
    );
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

  saveTesisData(thesisId: string, personalData: any): Promise<void> {
    const thesisRef = this.firestore.collection('tesis').doc(thesisId); // Obtiene la referencia de la tesis
    return thesisRef.set({ personalData }, { merge: true }); // Utiliza { merge: true } para actualizar la tesis existente
  }





  updateTesis1(tesisId: string, data: any): Promise<void> {
    console.log('Actualizando tesis con ID:', tesisId, 'con los datos:', data);

    // Crear un nuevo objeto con el campo "ciclo" que contiene los datos
    const updatedData = {
      ciclo: data
    };

    return this.firestore.collection('tesis').doc(tesisId).set(updatedData, { merge: true })
      .then(() => console.log('Datos actualizados correctamente en el atributo "ciclo"'))
      .catch(error => console.error('Error al actualizar:', error));
  }




  // Método para obtener un documento de la colección 'tesis' por su ID
  getTesisById(tesisId: string): Observable<any> {
    return this.firestore.collection('tesis').doc(tesisId).valueChanges();
  }





  // Obtener usuarios por rol
  getUserByRole(role: string): Observable<any> {
    return this.firestore.collection('users', ref => ref.where('role', '==', role)).valueChanges();
  }


  // Método para guardar un documento en la subcolección 'documents' de una tesis específica
  saveDocumentInTesis(tesisId: string, documentData: any): Promise<void> {
    return this.firestore
      .collection('tesis') // Acceder a la colección 'tesis'
      .doc(tesisId) // Seleccionar la tesis correspondiente
      .collection('documents') // Subcolección 'documents'
      .add(documentData) // Agregar el documento
      .then(() => {
        console.log('Documento guardado correctamente en la tesis.');
      })
      .catch(error => {
        console.error('Error al guardar el documento en la tesis:', error);
        throw error;
      });
  }

// Método para obtener documentos desde la subcolección 'documents' dentro de una tesis específica
  getDocumentsByTesisId(tesisId: string): Observable<any[]> {
    return this.firestore.collection('tesis').doc(tesisId).collection('documents')
      .snapshotChanges().pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as object;
          const id = a.payload.doc.id;
          return { id, ...data };
        }))
      );
  }

  getPersonalDataFromTesis(tesisId: string): Observable<any> {
    return this.firestore.collection('tesis').doc(tesisId).valueChanges().pipe(
      map((tesis: any) => tesis ? tesis.personalData : null)  // Accede a personalData directamente
    );
  }

  getTesisByUserId(userId: string | null): Observable<any[]> {
    if (!userId) return of([]); // Retorna un array vacío si userId es null

    return this.firestore.collection('tesis', ref => ref.where('userId', '==', userId))
      .snapshotChanges().pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as any;
          const id = a.payload.doc.id;
          return { id, ...data };
        }))
      );
  }



  getAllTesis(): Observable<any[]> {
    return this.firestore.collection('tesis').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as any;
        const id = a.payload.doc.id;
        return { id, ...data };
      }))
    );
  }

  updateDocumentsStates(tesisId: string, documentos: any[]) {
    const batch = this.firestore.firestore.batch();
    const docsRef = this.firestore.collection(`tesis/${tesisId}/documents`);

    documentos.forEach(doc => {
      const docRef = docsRef.doc(doc.id).ref;
      batch.update(docRef, doc);
    });

    return batch.commit();
  }



  addUser(userData: Partial<User>): Promise<DocumentReference<User>> {
    // Validación básica de datos requeridos
    if (!userData.email || !userData.firstName || !userData.lastName || !userData.role) {
      return Promise.reject(new Error("Faltan datos requeridos para el usuario (email, nombre, apellido, rol)."));
    }

    // 1. Añadir el documento sin el campo 'id' inicialmente
    return this.usersCollection.add(userData as User)
      .then(docRef => {
        // 2. Una vez creado, obtener el ID y actualizar el documento
        console.log(`Usuario ${userData.email} agregado con ID: ${docRef.id}. Actualizando con campo 'id'...`);
        // 3. Realizar la actualización para añadir el campo 'id'
        return docRef.update({ id: docRef.id })
          .then(() => {
            console.log(`Campo 'id' actualizado para ${docRef.id}.`);
            // 4. Devolver la referencia original después de la actualización exitosa
            return docRef;
          });
      })
      .catch(error => {
        console.error(`Error al agregar o actualizar usuario ${userData.email}:`, error);
        // Re-lanza el error para que pueda ser manejado por la función que llama (saveUsersBatch)
        throw new Error(`Error procesando ${userData.email}: ${error.message || error}`);
      });
  }

  getCycles() {
    return this.firestore.collection('cycle').valueChanges({ idField: 'id' });
  }



}
