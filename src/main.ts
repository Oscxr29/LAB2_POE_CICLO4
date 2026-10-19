import './styles/styles.css';
import { esTareaDTO, type TareaDTO } from './models/Tarea';
import { StorageService } from './services/StorageService';
import { TareaView } from './views/TareaView';
import { TareaController } from './controllers/TareaController';

// Único lugar donde se arman las piezas (composición manual de dependencias).
// Ninguna clase crea a otra por su cuenta, por eso cada una se puede probar suelta.
// La clave v2 separa el formato nuevo de la persistencia anterior.
const almacen = new StorageService<TareaDTO>('lab2-poe:tareas:v2', esTareaDTO);
const vista = new TareaView();
new TareaController(vista, almacen); // muestra la vista y conecta los eventos del gestor de tareas con la vista.
