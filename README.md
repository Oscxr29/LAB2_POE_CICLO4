# Gestor de tareas por prioridad

Laboratorio #2, Programación Orientada a Objetos (Proyecto 4).

Aplicación web hecha con TypeScript y Vite, sin frameworks, que organiza tareas por prioridad (alta, media, baja). Sigue el patrón MVC y guarda los datos en `localStorage`, así que sobrevive a recargar la página. No necesita servidor ni base de datos.

## Funcionalidades

- Registrar tareas con título y prioridad.
- Ordenar por prioridad o por fecha (más recientes primero).
- Filtrar por prioridad y por estado (pendientes o completadas), de forma combinada.
- Marcar y desmarcar tareas como completadas.
- Eliminar una tarea después de confirmarlo en un diálogo.
- Guardar todo en `localStorage`.
- Tema claro u oscuro según la preferencia del sistema.

## Requisitos y dependencias

| Qué | Detalle |
|---|---|
| Node.js | 20.19 o superior (o 22.12+) |
| npm | Viene con Node |
| Navegador | Uno actualizado (Chrome, Edge, Firefox, Safari) |

El proyecto no tiene dependencias de ejecución. Todo lo que se instala es de desarrollo:

| Paquete | Para qué sirve |
|---|---|
| `vite` | Servidor de desarrollo y empaquetado |
| `typescript` | Compilador y revisión de tipos |

Las versiones exactas están en `package.json`; las fija la plantilla `vanilla-ts` de Vite.

## Instalación y ejecución

Para quien clona el repositorio:

```bash
git clone <url-del-repositorio>
cd LAB2_poe
npm install
npm run dev
```

Abre la dirección que muestre la terminal, normalmente `http://localhost:5173`.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` | Revisa los tipos con `tsc` y genera la carpeta `dist/` |
| `npm run preview` | Sirve el resultado de `build` para probarlo |

## Cómo se creó el proyecto, paso a paso

Comandos en PowerShell (Windows Terminal). En bash cambian `Remove-Item` por `rm -r`, y `mkdir` con comas por `mkdir -p` con espacios.

**1. Crear el proyecto con Vite.** El punto instala en la carpeta actual. En el asistente se elige Vanilla y luego TypeScript.

```powershell
mkdir LAB2_poe
cd LAB2_poe
npm create vite@latest .
npm install
```

**2. Borrar el contenido de ejemplo** que trae la plantilla.

```powershell
Remove-Item -Recurse src/assets, src/counter.ts, src/style.css, public/icons.svg
```

**3. Crear la estructura de carpetas y los archivos vacíos.**

```powershell
mkdir src/models, src/views, src/controllers, src/services, src/styles
New-Item -ItemType File src/models/Tarea.ts, src/services/StorageService.ts, src/views/TareaView.ts, src/controllers/TareaController.ts, src/styles/styles.css
```

**4. Escribir el código**, de lo que no depende de nada a lo que depende de todo:

1. `src/models/Tarea.ts`: la entidad, los tipos y la validación de datos.
2. `src/services/StorageService.ts`: persistencia genérica.
3. `src/views/TareaView.ts`: DOM y eventos.
4. `src/controllers/TareaController.ts`: reglas y flujo.
5. `src/main.ts`: arma las piezas.
6. `index.html` y `src/styles/styles.css`: interfaz y estilos.

**5. Comprobar que compila y probar a mano.**

```powershell
npm run build
npm run dev
```

## Estructura del proyecto

```
LAB2_poe/
├── index.html
├── package.json
├── tsconfig.json
├── README.md
├── public/
│   └── favicon.svg
└── src/
    ├── main.ts
    ├── models/
    │   └── Tarea.ts
    ├── views/
    │   └── TareaView.ts
    ├── controllers/
    │   └── TareaController.ts
    ├── services/
    │   └── StorageService.ts
    └── styles/
        └── styles.css
```

## Arquitectura

| Pieza | Qué hace | Qué no hace |
|---|---|---|
| `Tarea` (modelo) | Define la tarea y su estado, y la convierte a y desde JSON | No toca el DOM ni `localStorage` |
| `TareaView` | Lee lo que hace el usuario y dibuja las tareas | No guarda datos ni decide reglas |
| `TareaController` | Agrega, completa, elimina, filtra y ordena, y coordina vista y servicio | No crea elementos HTML |
| `StorageService<T>` | Guarda y lee una lista de cualquier tipo `T` | No sabe qué es una tarea |

Cada acción sigue el mismo camino. El usuario hace algo, la vista lo detecta y llama a un callback, el controlador actualiza la lista, el servicio guarda si hubo cambios, y la vista redibuja con lo que el controlador le pasa. La vista nunca importa al controlador; recibe los callbacks en `enlazar()`. Solo `main.ts` conoce a todas las piezas.

## Decisiones de diseño

| Decisión | Motivo |
|---|---|
| `Tarea` inmutable | Cambiar el estado devuelve una copia nueva; nada se modifica por accidente |
| Type guard `esTareaDTO` | `localStorage` se puede editar a mano; lo que no cumpla la forma esperada se descarta |
| `StorageService<T>` genérico con clave versionada (`:v1`) | Se reutiliza con otros tipos y permite cambiar el esquema sin mezclar datos viejos |
| `textContent` en lugar de `innerHTML` | Un título con HTML se muestra como texto y no se ejecuta |
| `<dialog>` nativo para confirmar | Se estiliza, atrapa el foco y cierra con Esc sin código extra |
| Un solo listener en la lista | La lista se redibuja seguido; así no se registran listeners por tarea |
| Constructor con asignación manual | La plantilla de Vite activa `erasableSyntaxOnly`, que no permite `constructor(private x)` |

## Validaciones

- El título es obligatorio y se recorta con `trim()`: un título de puros espacios se rechaza con un mensaje visible.
- El título tiene un máximo de 120 caracteres (`maxlength`).
- La prioridad se comprueba contra los valores permitidos antes de crear la tarea.
- Los datos que se leen de `localStorage` se validan; si el JSON está corrupto, la app arranca vacía en vez de fallar.
- Eliminar siempre pide confirmación.

## Cumplimiento del enunciado y de la rúbrica

| Requerimiento | Dónde está |
|---|---|
| Registrar con título y prioridad | `TareaView.enlazar` (evento `submit`), `TareaController.agregar`, `Tarea.crear` |
| Ordenar por prioridad o fecha | `TareaController.obtenerVisibles` y `PESO_PRIORIDAD` |
| Filtrar por prioridad y estado | `TareaController.obtenerVisibles` |
| Marcar como completada | `TareaController.alternar` y `Tarea.alternarEstado` |
| Eliminar con confirmación | `TareaView.confirmarEliminacion` y `TareaController.eliminar` |
| Persistir en `localStorage` | `StorageService` y `TareaController.persistirYRefrescar` |

| Criterio de la rúbrica | Cómo se cubre |
|---|---|
| Arquitectura MVC | Cuatro clases en carpetas separadas; la vista y el modelo no se conocen entre sí |
| Programación TypeScript | Clases (`Tarea`, `TareaView`, `TareaController`, `StorageService<T>`), interfaces (`TareaDTO`, `ManejadoresVista`, `Resumen`), tipos literales (`Prioridad`, `Orden`, `FiltroEstado`), genéricos y type guards |
| Funcionalidad | Todos los requerimientos de la tabla anterior |
| Interfaz y validaciones | Colores por prioridad, eventos por delegación, diálogo de confirmación, mensajes de error y tema claro y oscuro |
| Documentación y defensa | Este README y comentarios en el código que explican el porqué de cada decisión |

## Pruebas manuales

- [ ] Agregar tres tareas con prioridades distintas: salen ordenadas de alta a baja.
- [ ] Cambiar el orden a "Más recientes": la última agregada sube.
- [ ] Filtrar por prioridad y por estado, solos y combinados.
- [ ] Marcar una tarea: se tacha y el contador baja.
- [ ] Eliminar con Cancelar o Esc: la tarea sigue. Eliminar con confirmación: desaparece.
- [ ] Recargar la página: todo sigue igual.
- [ ] Enviar un título de puros espacios: aparece el mensaje de error y no se crea la tarea.
- [ ] Escribir `<b>hola</b>` como título: se ve el texto literal, sin negrita.
- [ ] En DevTools, Application, Local Storage: existe la clave `lab2-poe:tareas:v1`.

## Autor

`<Oscar Fabricio Guevara Aguilar>`, Programación Orientada a Eventos.
