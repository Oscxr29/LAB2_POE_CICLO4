// Controlador: único que conoce a la vista, al servicio y a las tareas.
// Aquí viven las reglas (CRUD, filtrar, ordenar) y el flujo "cambia algo → guarda → redibuja".

import type {
  Categoria,
  FiltroCategoria,
  FiltroEstado,
  FiltroPrioridad,
  Orden,
  Prioridad,
  TareaDTO,
} from '../models/Tarea';
import { PESO_PRIORIDAD, Tarea } from '../models/Tarea';
import type { StorageService } from '../services/StorageService';
import type { TareaView } from '../views/TareaView';

export class TareaController {
  private tareas: Tarea[];
  private filtroPrioridad: FiltroPrioridad = 'todas';
  private filtroEstado: FiltroEstado = 'todas';
  private filtroCategoria: FiltroCategoria = 'todas';
  private textoBusqueda = '';
  private orden: Orden = 'prioridad';

  private readonly vista: TareaView;
  private readonly almacen: StorageService<TareaDTO>;

  constructor(vista: TareaView, almacen: StorageService<TareaDTO>) {
    this.vista = vista;
    this.almacen = almacen;
    this.tareas = almacen.cargar().map(Tarea.desdeDTO);

    this.vista.enlazar({
      onGuardar: (titulo, prioridad, categoria, fechaLimite, id) =>
        this.guardar(titulo, prioridad, categoria, fechaLimite, id),
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
      onFiltroCategoria: (valor) => {
        this.filtroCategoria = valor;
        this.refrescar();
      },
      onBusqueda: (valor) => {
        this.textoBusqueda = valor.trim().toLocaleLowerCase();
        this.refrescar();
      },
      onOrden: (valor) => {
        this.orden = valor;
        this.refrescar();
      },
    });

    this.refrescar();
  }

  private guardar(
    titulo: string,
    prioridad: Prioridad,
    categoria: Categoria,
    fechaLimite: string,
    id: string | null,
  ): boolean {
    // Normalizar permite detectar duplicados aunque solo cambien mayúsculas o espacios.
    const tituloNormalizado = titulo.trim().toLocaleLowerCase();
    const duplicada = this.tareas.some((t) => t.id !== id && t.titulo.toLocaleLowerCase() === tituloNormalizado);
    if (duplicada) {
      this.vista.mostrarError('Ya existe una tarea con ese título.');
      return false;
    }

    const tarea = id === null ? Tarea.crear(titulo, prioridad, categoria, fechaLimite) : this.tareas.find((t) => t.id === id);
    if (tarea === undefined) {
      this.vista.mostrarError('No se encontró la tarea que intentas editar.');
      return false;
    }

    this.tareas =
      id === null
        ? [...this.tareas, tarea]
        : this.tareas.map((actual) => (actual.id === id ? actual.editar(titulo, prioridad, categoria, fechaLimite) : actual));
    this.persistirYRefrescar();
    return true;
  }

  private alternar(id: string): void {
    // map crea un arreglo nuevo y solo reemplaza la tarea tocada (Tarea es inmutable).
    this.tareas = this.tareas.map((t) => (t.id === id ? t.alternarEstado() : t));
    this.persistirYRefrescar();
  }

  private async eliminar(id: string): Promise<void> {
    const tarea = this.tareas.find((t) => t.id === id);
    if (!tarea) return;

    const confirmado = await this.vista.confirmarEliminacion(tarea.titulo);
    if (!confirmado) return;

    this.tareas = this.tareas.filter((t) => t.id !== id);
    this.persistirYRefrescar();
  }

  private obtenerVisibles(): Tarea[] {
    // Los filtros se combinan para mostrar únicamente las tareas que cumplen todos los criterios activos.
    const visibles = this.tareas.filter((t) => {
      const cumpleTexto =
        this.textoBusqueda === '' ||
        t.titulo.toLocaleLowerCase().includes(this.textoBusqueda) ||
        t.categoria.toLocaleLowerCase().includes(this.textoBusqueda);
      const cumplePrioridad = this.filtroPrioridad === 'todas' || t.prioridad === this.filtroPrioridad;
      const cumpleEstado =
        this.filtroEstado === 'todas' ||
        (this.filtroEstado === 'completadas' ? t.completada : !t.completada);
      const cumpleCategoria = this.filtroCategoria === 'todas' || t.categoria === this.filtroCategoria;
      return cumpleTexto && cumplePrioridad && cumpleEstado && cumpleCategoria;
    });

    return visibles.sort((a, b) => {
      if (this.orden === 'titulo') return a.titulo.localeCompare(b.titulo, 'es', { sensitivity: 'base' });
      if (this.orden === 'fecha') return b.fecha.getTime() - a.fecha.getTime();
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
      alta: this.tareas.filter((t) => t.prioridad === 'alta').length,
      media: this.tareas.filter((t) => t.prioridad === 'media').length,
      baja: this.tareas.filter((t) => t.prioridad === 'baja').length,
    });
  }
}
