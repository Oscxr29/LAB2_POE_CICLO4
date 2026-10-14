// Modelo: describe qué es una tarea y nada más. No toca el DOM ni localStorage.

export const PRIORIDADES = ['alta', 'media', 'baja'] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

// Tipos de los filtros y del orden. Viven aquí para que Vista y Controlador
// los compartan sin importarse entre ellos (así evitamos imports circulares).
export type FiltroPrioridad = Prioridad | 'todas';
export type FiltroEstado = 'todas' | 'pendientes' | 'completadas';
export type Orden = 'prioridad' | 'fecha';

// Menor número = más urgente. Sirve directo como criterio de sort().
export const PESO_PRIORIDAD: Record<Prioridad, number> = {
  alta: 0,
  media: 1,
  baja: 2,
};

// Forma "plana" de una tarea: es lo que realmente se guarda en localStorage.
// JSON no tiene tipo Date, por eso la fecha viaja como texto ISO 8601.
export interface TareaDTO {
  id: string;
  titulo: string;
  prioridad: Prioridad;
  completada: boolean;
  fecha: string;
}

export function esPrioridad(valor: unknown): valor is Prioridad {
  return typeof valor === 'string' && (PRIORIDADES as readonly string[]).includes(valor);
}

// Type guard: localStorage lo puede editar cualquiera desde las DevTools,
// así que no confiamos en lo que lea JSON.parse sin revisarlo.
export function esTareaDTO(valor: unknown): valor is TareaDTO {
  if (typeof valor !== 'object' || valor === null) return false;
  const v = valor as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.titulo === 'string' &&
    esPrioridad(v.prioridad) &&
    typeof v.completada === 'boolean' &&
    typeof v.fecha === 'string' &&
    !Number.isNaN(Date.parse(v.fecha))
  );
}

interface DatosTarea {
  id: string;
  titulo: string;
  prioridad: Prioridad;
  completada: boolean;
  fecha: Date;
}

// Tarea es inmutable: para "cambiar" algo se crea una copia nueva.
// Cuesta un objeto más, pero evita que otra parte del código la modifique
// por accidente y hace el estado mucho más fácil de seguir al depurar.
export class Tarea {
  readonly id: string;
  readonly titulo: string;
  readonly prioridad: Prioridad;
  readonly completada: boolean;
  readonly fecha: Date;

  constructor(datos: DatosTarea) {
    this.id = datos.id;
    this.titulo = datos.titulo;
    this.prioridad = datos.prioridad;
    this.completada = datos.completada;
    this.fecha = datos.fecha;
  }

  static crear(titulo: string, prioridad: Prioridad): Tarea {
    return new Tarea({
      id: crypto.randomUUID(),
      titulo: titulo.trim(),
      prioridad,
      completada: false,
      fecha: new Date(),
    });
  }

  static desdeDTO(dto: TareaDTO): Tarea {
    return new Tarea({ ...dto, fecha: new Date(dto.fecha) });
  }

  alternarEstado(): Tarea {
    return new Tarea({ ...this.aDatos(), completada: !this.completada });
  }

  aDTO(): TareaDTO {
    return { ...this.aDatos(), fecha: this.fecha.toISOString() };
  }

  private aDatos(): DatosTarea {
    return {
      id: this.id,
      titulo: this.titulo,
      prioridad: this.prioridad,
      completada: this.completada,
      fecha: this.fecha,
    };
  }
}