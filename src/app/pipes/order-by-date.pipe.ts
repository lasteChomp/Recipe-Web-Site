import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'orderByDate',
  standalone: true
})
export class OrderByDatePipe implements PipeTransform {
  transform(array: any[], field: string, direction: 'asc' | 'desc' = 'desc'): any[] {
    if (!Array.isArray(array)) return array;
    return array.slice().sort((a, b) => {
      const dateA = a[field]?.toDate ? a[field].toDate() : new Date(a[field]);
      const dateB = b[field]?.toDate ? b[field].toDate() : new Date(b[field]);
      return direction === 'asc'
        ? dateA - dateB
        : dateB - dateA;
    });
  }
} 