// Servicio de persistencia. Es genérico: no sabe qué es una "tarea", solo
// guarda y recupera listas de T. Si mañana el proyecto guarda notas o
// usuarios, esta clase se reutiliza sin tocarla.

export class StorageService<T> { 
  private readonly clave: string;
  private readonly validar: (dato: unknown) => dato is T;

  // La clave lleva una versión para no mezclar datos viejos con un esquema nuevo.
  // El validador evita convertir datos corruptos en objetos de la aplicación.
  constructor(clave: string, validar: (dato: unknown) => dato is T) {
    this.clave = clave;
    this.validar = validar;
  }

  // Recupera y valida la colección guardada; si no existe, inicia vacía.
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

  // Serializa la colección actual y la escribe bajo la clave configurada.
  guardar(items: readonly T[]): void {
    try {
      localStorage.setItem(this.clave, JSON.stringify(items));
    } catch (error) {
      // Cuota llena o acceso denegado: la app sigue funcionando, solo sin persistir.
      console.error(`No se pudo guardar "${this.clave}":`, error);
    }
  }
}
