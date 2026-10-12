import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Kolom waktu memakai nama Indonesia di DB (dibuat_pada/diperbarui_pada) dan
// frontend membacanya dengan nama itu, bukan created_at/updated_at.
const ALIAS_KUNCI: Record<string, string> = {
  createdAt: 'dibuat_pada',
  updatedAt: 'diperbarui_pada',
};

function toSnakeCase(str: string): string {
  if (ALIAS_KUNCI[str]) {
    return ALIAS_KUNCI[str];
  }

  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function mapToSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => mapToSnakeCase(v));
  } else if (obj !== null && typeof obj === 'object') {
    if (obj instanceof Date) {
      return obj.toISOString();
    }
    
    // Convert to plain object if it has a custom prototype (like Prisma Decimal or Date)
    // Wait, Decimal doesn't serialize nicely like this. 
    // It's safer to JSON stringify and parse first to strip out Prisma wrappers, then map.
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = toSnakeCase(key);
      result[snakeKey] = mapToSnakeCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

@Injectable()
export class SnakeCaseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (data === undefined || data === null) {
          return data;
        }
        // First convert to standard JS objects via JSON to strip Prisma symbols/classes
        const plainData = JSON.parse(JSON.stringify(data));
        return mapToSnakeCase(plainData);
      }),
    );
  }
}
