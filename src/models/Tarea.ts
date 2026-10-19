// Modelo: describe qué es una tarea y nada más. No toca el DOM ni localStorage.

export const PRIORIDADES = ['alta', 'media', 'baja'] as const;
export type Prioridad = (typeof PRIORIDADES)[number];
export const CATEGORIAS = ['estudio', 'trabajo', 'personal'] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export type FiltroPrioridad = Prioridad | 'todas';
export type FiltroEstado = 'todas' | 'pendientes' | 'completadas';
export type FiltroCategoria = Categoria | 'todas';
export type Orden = 'prioridad' | 'fecha' | 'titulo';

export const PESO_PRIORIDAD: Record<Prioridad, number> = {
  alta: 0,
  media: 1,
  baja: 2,
};

// El DTO conserva la fecha límite como YYYY-MM-DD para que el calendario no
// cambie de día al convertirlo entre distintas zonas horarias.
export interface TareaDTO {
  id: string;
  titulo: string;
  prioridad: Prioridad;
  categoria: Categoria;
  fechaLimite: string;
  completada: boolean;
  fecha: string;
}

// Confirma que un valor externo pertenece al conjunto permitido de prioridades.
export function esPrioridad(valor: unknown): valor is Prioridad {
  return typeof valor === 'string' && (PRIORIDADES as readonly string[]).includes(valor);
}

// Confirma que una categoría leída del formulario o del almacenamiento es válida.
export function esCategoria(valor: unknown): valor is Categoria {
  return typeof valor === 'string' && (CATEGORIAS as readonly string[]).includes(valor);
}

// Protege el modelo antes de aceptar datos provenientes de localStorage.
export function esTareaDTO(valor: unknown): valor is TareaDTO {
  if (typeof valor !== 'object' || valor === null) return false;
  const v = valor as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.titulo === 'string' &&
    esPrioridad(v.prioridad) &&
    esCategoria(v.categoria) &&
    typeof v.fechaLimite === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.fechaLimite) &&
    !Number.isNaN(Date.parse(`${v.fechaLimite}T00:00:00`)) &&
    typeof v.completada === 'boolean' &&
    typeof v.fecha === 'string' &&
    !Number.isNaN(Date.parse(v.fecha))
  );
}

export interface DatosTarea {
  id: string;
  titulo: string;
  prioridad: Prioridad;
  categoria: Categoria;
  fechaLimite: string;
  completada: boolean;
  fecha: Date;
}

// Tarea es inmutable: para "cambiar" algo se crea una copia nueva.
export class Tarea {
  readonly id: string;
  readonly titulo: string;
  readonly prioridad: Prioridad;
  readonly categoria: Categoria;
  readonly fechaLimite: string;
  readonly completada: boolean;
  readonly fecha: Date;

  // Recibe todos los datos necesarios para construir una tarea completa.
  constructor(datos: DatosTarea) {
    this.id = datos.id;
    this.titulo = datos.titulo;
    this.prioridad = datos.prioridad;
    this.categoria = datos.categoria;
    this.fechaLimite = datos.fechaLimite;
    this.completada = datos.completada;
    this.fecha = datos.fecha;
  }

  // Crea una tarea nueva con identificador y fecha de creación propios.
  static crear(titulo: string, prioridad: Prioridad, categoria: Categoria, fechaLimite: string): Tarea {
    return new Tarea({
      id: crypto.randomUUID(), // Genera un identificador único para la tarea.
      titulo: titulo.trim(),
      prioridad,
      categoria,
      fechaLimite,
      completada: false,
      fecha: new Date(),
    });
  }

  // Reconstruye una tarea desde el formato plano guardado como JSON.
  static desdeDTO(dto: TareaDTO): Tarea {
    return new Tarea({ ...dto, fecha: new Date(dto.fecha) });
  }

  // Devuelve una copia con los cambios para conservar el estado original intacto.
  editar(titulo: string, prioridad: Prioridad, categoria: Categoria, fechaLimite: string): Tarea {
    return new Tarea({ ...this.aDatos(), titulo: titulo.trim(), prioridad, categoria, fechaLimite });
  }

  // Cambia el estado devolviendo otra instancia, sin mutar la tarea original.
  alternarEstado(): Tarea {
    return new Tarea({ ...this.aDatos(), completada: !this.completada });
  }

  // Convierte la entidad a un formato serializable para localStorage.
  aDTO(): TareaDTO {
    return { ...this.aDatos(), fecha: this.fecha.toISOString() };
  }

  // Reúne los datos internos compartidos por las operaciones inmutables.
  private aDatos(): DatosTarea {
    return {
      id: this.id,
      titulo: this.titulo,
      prioridad: this.prioridad,
      categoria: this.categoria,
      fechaLimite: this.fechaLimite,
      completada: this.completada,
      fecha: this.fecha,
    };
  }
}
