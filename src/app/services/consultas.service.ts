import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import Class from '../interfaces/classes.interface';
import User from '../interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class ConsultasService {

  constructor(private firestore: AngularFirestore) {}

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



}
