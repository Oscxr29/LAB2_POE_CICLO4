// Vista: lee lo que el usuario hace y dibuja el estado que le pasan.
// No guarda tareas ni decide reglas; solo avisa al controlador mediante callbacks.

import type { FiltroEstado, FiltroPrioridad, Orden, Prioridad, Tarea } from '../models/Tarea';
import { esPrioridad } from '../models/Tarea';

export interface ManejadoresVista {
  onAgregar(titulo: string, prioridad: Prioridad): void;
  onAlternar(id: string): void;
  onEliminar(id: string): void;
  onFiltroPrioridad(valor: FiltroPrioridad): void;
  onFiltroEstado(valor: FiltroEstado): void;
  onOrden(valor: Orden): void;
}

export interface Resumen {
  total: number;
  pendientes: number;
}

const formatoFecha = new Intl.DateTimeFormat('es-SV', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

// Busca un elemento por id y falla con un mensaje claro si el HTML cambió.
// Mejor un error explícito al arrancar que un "null" misterioso más adelante.
function obtener<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta el elemento #${id} en index.html`);
  return el as T;
}

export class TareaView {
  private readonly formulario = obtener<HTMLFormElement>('form-tarea');
  private readonly inputTitulo = obtener<HTMLInputElement>('input-titulo');
  private readonly errorTitulo = obtener<HTMLParagraphElement>('error-titulo');
  private readonly selectPrioridad = obtener<HTMLSelectElement>('select-prioridad');
  private readonly filtroPrioridad = obtener<HTMLSelectElement>('filtro-prioridad');
  private readonly filtroEstado = obtener<HTMLSelectElement>('filtro-estado');
  private readonly selectOrden = obtener<HTMLSelectElement>('select-orden');
  private readonly lista = obtener<HTMLUListElement>('lista-tareas');
  private readonly vacio = obtener<HTMLParagraphElement>('estado-vacio');
  private readonly contador = obtener<HTMLElement>('contador');
  private readonly dialogo = obtener<HTMLDialogElement>('dialogo-confirmar');
  private readonly textoDialogo = obtener<HTMLElement>('dialogo-texto');

  enlazar(manejadores: ManejadoresVista): void {
    this.formulario.addEventListener('submit', (evento) => {
      evento.preventDefault();
      const titulo = this.inputTitulo.value.trim();
      const prioridad = this.selectPrioridad.value;

      // El atributo "required" deja pasar un título de puros espacios,
      // así que la validación real se repite aquí, con mensaje visible.
      if (titulo === '') {
        this.mostrarError('Escribe un título para la tarea.');
        return;
      }
      if (!esPrioridad(prioridad)) {
        this.mostrarError('Elige una prioridad válida.');
        return;
      }

      this.limpiarError();
      manejadores.onAgregar(titulo, prioridad);
      this.formulario.reset();
      this.inputTitulo.focus();
    });

    // El error desaparece apenas el usuario vuelve a escribir.
    this.inputTitulo.addEventListener('input', () => this.limpiarError());

    this.filtroPrioridad.addEventListener('change', () => {
      manejadores.onFiltroPrioridad(this.filtroPrioridad.value as FiltroPrioridad);
    });
    this.filtroEstado.addEventListener('change', () => {
      manejadores.onFiltroEstado(this.filtroEstado.value as FiltroEstado);
    });
    this.selectOrden.addEventListener('change', () => {
      manejadores.onOrden(this.selectOrden.value as Orden);
    });

    // Delegación de eventos: un solo listener en la <ul> en vez de uno por tarea.
    // Las tareas se redibujan seguido, así no hay que registrar y limpiar listeners cada vez.
    this.lista.addEventListener('change', (evento) => {
      const objetivo = evento.target;
      if (!(objetivo instanceof HTMLInputElement) || objetivo.type !== 'checkbox') return;
      const id = objetivo.closest<HTMLLIElement>('li[data-id]')?.dataset.id;
      if (id) manejadores.onAlternar(id);
    });

    this.lista.addEventListener('click', (evento) => {
      const objetivo = evento.target;
      if (!(objetivo instanceof Element)) return;
      const boton = objetivo.closest<HTMLButtonElement>('button[data-accion="eliminar"]');
      const id = boton?.closest<HTMLLIElement>('li[data-id]')?.dataset.id;
      if (id) manejadores.onEliminar(id);
    });
  }

  render(tareas: readonly Tarea[], resumen: Resumen): void {
    // El redibujado destruye el checkbox que tenía el foco; lo recordamos
    // para devolvérselo y que quien navega con teclado no pierda su lugar.
    const activo = document.activeElement;
    const idEnfocado = activo instanceof HTMLElement ? activo.closest<HTMLLIElement>('li[data-id]')?.dataset.id : undefined;

    this.lista.replaceChildren(...tareas.map((t) => this.crearItem(t)));
    this.vacio.hidden = tareas.length > 0;
    this.contador.textContent =
      resumen.total === 0
        ? 'Sin tareas todavía'
        : `${resumen.pendientes} pendiente${resumen.pendientes === 1 ? '' : 's'} de ${resumen.total}`;

    if (idEnfocado) {
      this.lista.querySelector<HTMLInputElement>(`li[data-id="${idEnfocado}"] input[type="checkbox"]`)?.focus();
    }
  }

  private mostrarError(mensaje: string): void {
    this.errorTitulo.textContent = mensaje;
    this.errorTitulo.hidden = false;
    this.inputTitulo.setAttribute('aria-invalid', 'true');
    this.inputTitulo.focus();
  }

  private limpiarError(): void {
    this.errorTitulo.hidden = true;
    this.errorTitulo.textContent = '';
    this.inputTitulo.removeAttribute('aria-invalid');
  }

  // <dialog> nativo en lugar de window.confirm(): se puede estilizar, atrapa el foco
  // y se cierra con Esc sin escribir nada extra.
  confirmarEliminacion(titulo: string): Promise<boolean> {
    this.textoDialogo.textContent = `«${titulo}» se eliminará de forma permanente.`;
    // returnValue conserva el valor de la vez anterior; sin este reset,
    // cerrar con Esc devolvería "confirmar" si antes se confirmó algo.
    this.dialogo.returnValue = '';

    return new Promise((resolver) => {
      this.dialogo.addEventListener('close', () => resolver(this.dialogo.returnValue === 'confirmar'), { once: true });
      this.dialogo.showModal();
    });
  }

  // Todo el texto del usuario entra con textContent, nunca con innerHTML.
  // Así un título como <img onerror=...> se muestra como texto y no se ejecuta (XSS).
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
    etiqueta.textContent = tarea.prioridad;

    const fecha = document.createElement('time');
    fecha.dateTime = tarea.fecha.toISOString();
    fecha.textContent = formatoFecha.format(tarea.fecha);

    meta.append(etiqueta, fecha);
    cuerpo.append(titulo, meta);

    const eliminar = document.createElement('button');
    eliminar.type = 'button';
    eliminar.className = 'btn-eliminar';
    eliminar.dataset.accion = 'eliminar';
    eliminar.setAttribute('aria-label', `Eliminar «${tarea.titulo}»`);
    eliminar.textContent = '✕';

    li.append(check, cuerpo, eliminar);
    return li;
  }
}