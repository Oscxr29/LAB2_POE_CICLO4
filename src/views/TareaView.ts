// Vista: lee lo que el usuario hace y dibuja el estado que le pasan.
// No guarda tareas ni decide reglas; solo avisa al controlador mediante callbacks.

import type {
  Categoria,
  FiltroCategoria,
  FiltroEstado,
  FiltroPrioridad,
  Orden,
  Prioridad,
  Tarea,
} from '../models/Tarea';
import { esCategoria, esPrioridad } from '../models/Tarea';

export interface ManejadoresVista {
  onGuardar(titulo: string, prioridad: Prioridad, categoria: Categoria, fechaLimite: string, id: string | null): boolean;
  onAlternar(id: string): void;
  onEliminar(id: string): void;
  onFiltroPrioridad(valor: FiltroPrioridad): void;
  onFiltroEstado(valor: FiltroEstado): void;
  onFiltroCategoria(valor: FiltroCategoria): void;
  onBusqueda(valor: string): void;
  onOrden(valor: Orden): void;
}

export interface Resumen {
  total: number;
  pendientes: number;
  alta: number;
  media: number;
  baja: number;
}

const formatoFecha = new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeStyle: 'short' });
const formatoFechaLimite = new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium' });

function obtener<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta el elemento #${id} en index.html`);
  return el as T;
}

// Devuelve la fecha local en el formato que utiliza el campo date.
function fechaDeHoy(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

export class TareaView { // La vista no sabe nada de tareas, solo de HTML y eventos. Por que eso no importa que el nombre de la clase sea TareaView, ya que es una vista de tareas.
  private readonly formulario = obtener<HTMLFormElement>('form-tarea');
  private readonly inputTitulo = obtener<HTMLInputElement>('input-titulo');
  private readonly errorTitulo = obtener<HTMLParagraphElement>('error-titulo');
  private readonly selectPrioridad = obtener<HTMLSelectElement>('select-prioridad');
  private readonly selectCategoria = obtener<HTMLSelectElement>('select-categoria');
  private readonly inputFechaLimite = obtener<HTMLInputElement>('input-fecha-limite');
  private readonly botonSubmit = obtener<HTMLButtonElement>('btn-submit');
  private readonly botonCancelar = obtener<HTMLButtonElement>('btn-cancelar');
  private readonly filtroPrioridad = obtener<HTMLSelectElement>('filtro-prioridad');
  private readonly filtroEstado = obtener<HTMLSelectElement>('filtro-estado');
  private readonly filtroCategoria = obtener<HTMLSelectElement>('filtro-categoria');
  private readonly inputBuscar = obtener<HTMLInputElement>('input-buscar');
  private readonly selectOrden = obtener<HTMLSelectElement>('select-orden');
  private readonly lista = obtener<HTMLUListElement>('lista-tareas');
  private readonly vacio = obtener<HTMLParagraphElement>('estado-vacio');
  private readonly contador = obtener<HTMLElement>('contador');
  private readonly contadorPrioridad = obtener<HTMLElement>('contador-prioridad');
  private readonly dialogo = obtener<HTMLDialogElement>('dialogo-confirmar');
  private readonly textoDialogo = obtener<HTMLElement>('dialogo-texto');
  private idEditando: string | null = null;
  private tareasActuales: readonly Tarea[] = [];

  // Registra los eventos del formulario, filtros y lista mediante callbacks.
  enlazar(manejadores: ManejadoresVista): void {
    this.inputFechaLimite.value = fechaDeHoy();

    this.formulario.addEventListener('submit', (evento) => {
      evento.preventDefault();
      const titulo = this.inputTitulo.value.trim();
      const prioridad = this.selectPrioridad.value;
      const categoria = this.selectCategoria.value;
      const fechaLimite = this.inputFechaLimite.value;

      if (titulo === '') return this.mostrarError('Escribe un título para la tarea.');
      if (!esPrioridad(prioridad)) return this.mostrarError('Elige una prioridad válida.');
      if (!esCategoria(categoria)) return this.mostrarError('Elige una categoría válida.');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaLimite)) return this.mostrarError('Elige una fecha límite válida.');

      this.limpiarError();
      if (manejadores.onGuardar(titulo, prioridad, categoria, fechaLimite, this.idEditando)) {
        this.cancelarEdicion();
      }
    });

    this.botonCancelar.addEventListener('click', () => this.cancelarEdicion());
    this.inputTitulo.addEventListener('input', () => this.limpiarError());
    this.filtroPrioridad.addEventListener('change', () => manejadores.onFiltroPrioridad(this.filtroPrioridad.value as FiltroPrioridad));
    this.filtroEstado.addEventListener('change', () => manejadores.onFiltroEstado(this.filtroEstado.value as FiltroEstado));
    this.filtroCategoria.addEventListener('change', () => manejadores.onFiltroCategoria(this.filtroCategoria.value as FiltroCategoria));
    this.inputBuscar.addEventListener('input', () => manejadores.onBusqueda(this.inputBuscar.value));
    this.selectOrden.addEventListener('change', () => manejadores.onOrden(this.selectOrden.value as Orden));

    this.lista.addEventListener('change', (evento) => {
      const objetivo = evento.target;
      if (!(objetivo instanceof HTMLInputElement) || objetivo.type !== 'checkbox') return;
      const id = objetivo.closest<HTMLLIElement>('li[data-id]')?.dataset.id;
      if (id) manejadores.onAlternar(id);
    });

    this.lista.addEventListener('click', (evento) => {
      const objetivo = evento.target;
      if (!(objetivo instanceof Element)) return;
      const botonEditar = objetivo.closest<HTMLButtonElement>('button[data-accion="editar"]');
      const idEditar = botonEditar?.closest<HTMLLIElement>('li[data-id]')?.dataset.id;
      if (idEditar) this.iniciarEdicion(idEditar);
      const botonEliminar = objetivo.closest<HTMLButtonElement>('button[data-accion="eliminar"]');
      const idEliminar = botonEliminar?.closest<HTMLLIElement>('li[data-id]')?.dataset.id;
      if (idEliminar) manejadores.onEliminar(idEliminar);
    });
  }

  // Redibuja la lista y actualiza los contadores conservando el foco útil.
  render(tareas: readonly Tarea[], resumen: Resumen): void {
    this.tareasActuales = tareas;
    const activo = document.activeElement;
    const idEnfocado = activo instanceof HTMLElement ? activo.closest<HTMLLIElement>('li[data-id]')?.dataset.id : undefined;

    this.lista.replaceChildren(...tareas.map((t) => this.crearItem(t)));
    this.vacio.hidden = tareas.length > 0;
    this.contador.textContent =
      resumen.total === 0 ? 'Sin tareas todavía' : `${resumen.pendientes} pendiente${resumen.pendientes === 1 ? '' : 's'} de ${resumen.total}`;
    this.contadorPrioridad.textContent = `Alta: ${resumen.alta} · Media: ${resumen.media} · Baja: ${resumen.baja}`;

    if (idEnfocado) this.lista.querySelector<HTMLInputElement>(`li[data-id="${idEnfocado}"] input[type="checkbox"]`)?.focus();
  }

  // Muestra un error asociado al formulario y devuelve el foco al título.
  mostrarError(mensaje: string): void {
    this.errorTitulo.textContent = mensaje;
    this.errorTitulo.hidden = false;
    this.inputTitulo.setAttribute('aria-invalid', 'true');
    this.inputTitulo.focus();
  }

  // Oculta el mensaje de validación cuando el formulario vuelve a ser válido.
  private limpiarError(): void {
    this.errorTitulo.hidden = true;
    this.errorTitulo.textContent = '';
    this.inputTitulo.removeAttribute('aria-invalid');
  }

  // Carga una tarea en el formulario y activa el modo de actualización.
  private iniciarEdicion(id: string): void {
    const tarea = this.tareasActuales.find((actual) => actual.id === id);
    if (!tarea) return;
    this.idEditando = tarea.id;
    this.inputTitulo.value = tarea.titulo;
    this.selectPrioridad.value = tarea.prioridad;
    this.selectCategoria.value = tarea.categoria;
    this.inputFechaLimite.value = tarea.fechaLimite;
    this.botonSubmit.textContent = 'Actualizar';
    this.botonCancelar.hidden = false;
    this.inputTitulo.focus();
  }

  // Restablece el formulario y elimina el identificador temporal de edición.
  private cancelarEdicion(): void {
    this.idEditando = null;
    this.formulario.reset();
    this.inputFechaLimite.value = fechaDeHoy();
    this.botonSubmit.textContent = 'Agregar';
    this.botonCancelar.hidden = true;
    this.limpiarError();
    this.inputTitulo.focus();
  }

  // Resuelve si el usuario confirmó la eliminación mediante el diálogo nativo.
  confirmarEliminacion(titulo: string): Promise<boolean> {
    this.textoDialogo.textContent = `«${titulo}» se eliminará de forma permanente.`;
    this.dialogo.returnValue = '';
    return new Promise((resolver) => {
      this.dialogo.addEventListener('close', () => resolver(this.dialogo.returnValue === 'confirmar'), { once: true });
      this.dialogo.showModal();
    });
  }

  // Construye una fila segura de la lista a partir de una tarea del modelo.
  private crearItem(tarea: Tarea): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'tarea';
    li.dataset.id = tarea.id;
    li.dataset.prioridad = tarea.prioridad;
    li.classList.toggle('completada', tarea.completada);

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = tarea.completada;
    check.setAttribute('aria-label', `Marcar «${tarea.titulo}» como completada`);

    const cuerpo = document.createElement('div');
    cuerpo.className = 'tarea-cuerpo';
    const titulo = document.createElement('span');
    titulo.className = 'tarea-titulo';
    titulo.textContent = tarea.titulo;
    const meta = document.createElement('div');
    meta.className = 'tarea-meta';
    const etiqueta = document.createElement('span');
    etiqueta.className = 'etiqueta';
    etiqueta.textContent = `${tarea.prioridad} · ${tarea.categoria}`;
    const fecha = document.createElement('time');
    fecha.dateTime = tarea.fechaLimite;
    fecha.textContent = `Límite: ${formatoFechaLimite.format(new Date(`${tarea.fechaLimite}T00:00:00`))}`;
    const hoy = new Date().toISOString().split('T')[0];
    if (tarea.fechaLimite < hoy && !tarea.completada) {
      li.classList.add('vencida');
      fecha.textContent += ' ⚠️ VENCIDA';
      fecha.style.color = 'var(--alta)';
      fecha.style.fontWeight = 'bold';
    }
    const creada = document.createElement('time');
    creada.dateTime = tarea.fecha.toISOString();
    creada.textContent = `Creada: ${formatoFecha.format(tarea.fecha)}`;
    meta.append(etiqueta, fecha, creada);
    cuerpo.append(titulo, meta);

    const acciones = document.createElement('div');
    acciones.className = 'tarea-acciones';
    const editar = document.createElement('button');
    editar.type = 'button';
    editar.className = 'btn-editar';
    editar.dataset.accion = 'editar';
    editar.textContent = 'Editar';
    editar.setAttribute('aria-label', `Editar «${tarea.titulo}»`);
    const eliminar = document.createElement('button');
    eliminar.type = 'button';
    eliminar.className = 'btn-eliminar';
    eliminar.dataset.accion = 'eliminar';
    eliminar.setAttribute('aria-label', `Eliminar «${tarea.titulo}»`);
    eliminar.textContent = '✕';
    acciones.append(editar, eliminar);
    li.append(check, cuerpo, acciones);
    return li;
  }
}
