// Servicio de persistencia. Es genérico: no sabe qué es una "tarea", solo
// guarda y recupera listas de T. Si mañana el proyecto guarda notas o
// usuarios, esta clase se reutiliza sin tocarla.

export class StorageService<T> {
  private readonly clave: string;
  private readonly validar: (dato: unknown) => dato is T;

  // La clave lleva versión (":v1"). Si algún día cambia la forma de los datos,
  // se sube a ":v2" y no se mezclan datos viejos con el esquema nuevo.
  constructor(clave: string, validar: (dato: unknown) => dato is T) {
    this.clave = clave;
    this.validar = validar;
  }

  cargar(): T[] {
    try {
      const crudo = localStorage.getItem(this.clave);
      if (crudo === null) return [];
      const datos: unknown = JSON.parse(crudo);
      if (!Array.isArray(datos)) return [];
      // Lo que no pase la validación se descarta en vez de romper la app.
      return datos.filter(this.validar);
    } catch {
      // JSON corrupto o localStorage bloqueado (modo privado, políticas del navegador).
      return [];
    }
  }

  guardar(items: readonly T[]): void {
    try {
      localStorage.setItem(this.clave, JSON.stringify(items));
    } catch (error) {
      // Cuota llena o acceso denegado: la app sigue funcionando, solo sin persistir.
      console.error(`No se pudo guardar "${this.clave}":`, error);
    }
  }
}

