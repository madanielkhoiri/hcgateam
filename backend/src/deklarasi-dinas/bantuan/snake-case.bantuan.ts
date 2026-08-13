export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function mapToSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => mapToSnakeCase(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = toSnakeCase(key);
      result[snakeKey] = mapToSnakeCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}
