// Controlador: único que conoce a la vista, al servicio y a las tareas.
// Aquí viven las reglas (CRUD, filtrar, ordenar) y el flujo "cambia algo → guarda → redibuja".

import type { FiltroEstado, FiltroPrioridad, Orden, Prioridad, TareaDTO } from '../models/Tarea';
import { PESO_PRIORIDAD, Tarea } from '../models/Tarea';
import type { StorageService } from '../services/StorageService';
import type { TareaView } from '../views/TareaView';

export class TareaController {
  private tareas: Tarea[];
  private filtroPrioridad: FiltroPrioridad = 'todas';
  private filtroEstado: FiltroEstado = 'todas';
  private orden: Orden = 'prioridad';

  private readonly vista: TareaView;
  private readonly almacen: StorageService<TareaDTO>;

  constructor(vista: TareaView, almacen: StorageService<TareaDTO>) {
    this.vista = vista;
    this.almacen = almacen;
    this.tareas = almacen.cargar().map(Tarea.desdeDTO);

    this.vista.enlazar({
      onAgregar: (titulo, prioridad) => this.agregar(titulo, prioridad),
      onAlternar: (id) => this.alternar(id),
      onEliminar: (id) => void this.eliminar(id),
      onFiltroPrioridad: (valor) => {
        this.filtroPrioridad = valor;
        this.refrescar();
      },
      onFiltroEstado: (valor) => {
        this.filtroEstado = valor;
        this.refrescar();
      },
      onOrden: (valor) => {
        this.orden = valor;
        this.refrescar();
      },
    });

    this.refrescar();
  }

  private agregar(titulo: string, prioridad: Prioridad): void {
    this.tareas = [...this.tareas, Tarea.crear(titulo, prioridad)];
    this.persistirYRefrescar();
  }

  private alternar(id: string): void {
    // map crea un arreglo nuevo y solo reemplaza la tarea tocada (Tarea es inmutable).
    this.tareas = this.tareas.map((t) => (t.id === id ? t.alternarEstado() : t));
    this.persistirYRefrescar();
  }

  private async eliminar(id: string): Promise<void> {
    const tarea = this.tareas.find((t) => t.id === id);
    if (!tarea) return;

    // La pregunta es cosa de la vista; la decisión de borrar es del controlador.
    const confirmado = await this.vista.confirmarEliminacion(tarea.titulo);
    if (!confirmado) return;

    this.tareas = this.tareas.filter((t) => t.id !== id);
    this.persistirYRefrescar();
  }

  // Calcula lo que se ve sin tocar el arreglo original: los filtros son solo
  // una "mirada" sobre los datos, no los modifican ni los borran.
  private obtenerVisibles(): Tarea[] {
    const visibles = this.tareas.filter((t) => {
      const cumplePrioridad = this.filtroPrioridad === 'todas' || t.prioridad === this.filtroPrioridad;
      const cumpleEstado =
        this.filtroEstado === 'todas' ||
        (this.filtroEstado === 'completadas' ? t.completada : !t.completada);
      return cumplePrioridad && cumpleEstado;
    });

    return visibles.sort((a, b) => {
      if (this.orden === 'fecha') return b.fecha.getTime() - a.fecha.getTime();
      // Por prioridad; si empatan, la más reciente primero.
      return PESO_PRIORIDAD[a.prioridad] - PESO_PRIORIDAD[b.prioridad] || b.fecha.getTime() - a.fecha.getTime();
    });
  }

  private persistirYRefrescar(): void {
    this.almacen.guardar(this.tareas.map((t) => t.aDTO()));
    this.refrescar();
  }

  private refrescar(): void {
    this.vista.render(this.obtenerVisibles(), {
      total: this.tareas.length,
      pendientes: this.tareas.filter((t) => !t.completada).length,
    });
  }
}