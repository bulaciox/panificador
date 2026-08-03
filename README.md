# Panificador

App de tareas diarias con arrastre de días pasados, archivo, subtareas y prioridades.

- **Backend**: .NET 10, Minimal API + EF Core sobre SQLite (`server/TodoApp.Api`)
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS 4, con componentes al estilo shadcn/ui sobre Radix (`web`)

## Cómo funciona

**La barra lateral** manda, con el nombre de la app arriba a la izquierda: **Hoy** (con lo
arrastrado de días pasados), **Futuras** (lo planificado para más adelante, agrupado por día),
**Archivo** y, tras un pequeño hueco, **Hábitos**, que no comparte nada con las tareas pero vive
en el mismo menú. Debajo van las **carpetas** que crea el usuario para sus temas (Casa, Trabajo,
Recados…). Cada entrada lleva su contador de pendientes. No hay tira de calendario: para revisar otro día están las flechas discretas de
la cabecera de Hoy, o pinchar el día desde Futuras.

Las carpetas se crean con el `+` de la sección Carpetas, se renombran, se les cambia el color
y se borran desde su menú `⋯`. **Borrar una carpeta no borra sus tareas**: se quedan sin
carpeta. Una tarea se mueve de carpeta desde `⋯ → Carpeta`, y sus subtareas la siguen.

**Arrastre de días pasados.** Una tarea pendiente de un día anterior aparece automáticamente
en el día de hoy, marcada con una píldora ámbar (`de ayer`, `hace 3 días`…) y agrupada bajo
_"De días anteriores"_. No se duplica: sigue siendo la misma tarea, con su fecha original.
Los días futuros muestran solo lo que tienen asignado.

Para quitártela de encima hay dos salidas:

- **Que desaparezca por hoy** — se oculta solo en ese día y vuelve al siguiente. Si te
  arrepientes, al final de la lista aparece _"N tareas ocultas por hoy · ver"_ para recuperarla.
- **Mandar al archivo** — deja de arrastrarse para siempre, pero no se borra. Vive en la
  carpeta **Archivo**, desde donde puedes devolverla a hoy o eliminarla del todo.

**Hecho hoy vs. hecho otro día.** Al completar una tarea se guarda *el día* en que se hizo:

| Estado | Aspecto |
| --- | --- |
| Pendiente | círculo vacío, texto normal |
| Hecha ese mismo día | círculo azul relleno, texto atenuado, **sin tachar** |
| Hecha en otro día | círculo gris, texto **tachado** y más apagado |

**Subtareas.** Cualquier tarea puede tener hijas (hasta 2 niveles desde la interfaz).
Viven en el día de su madre, se mueven con ella, y completar la madre completa a las hijas;
reabrir una hija reabre a la madre. El contador `1/2` de la fila resume el progreso.

**Prioridades.** Alta / media / baja / ninguna, con banderita de color. El botón **Orden**
de la cabecera alterna entre el orden manual y el orden por prioridad.

**Hábitos** (`Hábitos` en la barra lateral) son otra cosa distinta de las tareas: no tienen
fecha de vencimiento, ni carpeta, ni arrastre. Solo una rejilla de días, con hoy en la última
columna a la derecha y el número dentro de un círculo verde.

La rejilla se adapta al ancho disponible en vez de desplazarse en horizontal: en el móvil salen
**hoy y los tres días anteriores**, sin los contadores de la derecha, y a medida que hay sitio se
van añadiendo días hacia atrás hasta las dos semanas, con los contadores de vuelta.

Cada celda tiene tres estados y se recorren a clics:

| Clics | Estado | Aspecto |
| --- | --- | --- |
| 1 | Cumplido | celda al color del hábito; **cada día seguido lo intensifica** hasta llegar al tono pleno a los 6 días |
| 2 | Saltado | media celda en diagonal: **conserva la intensidad** conseguida pero no la sube |
| 3 | Sin marcar | celda vacía, y la cadena se rompe |

El orden de los hábitos lo decides tú con las flechas que hay a la izquierda de cada nombre.
Solo asoman al pasar el cursor por encima de la fila, y en pantallas táctiles (donde no hay
cursor que las revele) se quedan siempre visibles. El orden se guarda en el servidor.

Los días saltados son la válvula de escape para no perder una racha por un día malo, y por eso
están limitados: **no se pueden saltar más de dos días seguidos**. Al intentar el tercero la app
lo rechaza y avisa. Los fines de semana sin marcar salen en gris claro para orientarse, y los
contadores de la derecha (semana natural, mes y año) cuentan **solo días cumplidos**: los
saltados mantienen el color pero no suman.

**Fortalezas** (`Fortalezas` en la barra lateral) es una bitácora, no una lista de tareas ni
una rejilla: aquí escribes los momentos en los que fuiste fuerte, sea resistir algo que quieres
romper o hacer algo que te cuesta. Cada momento guarda su hora y una **etiqueta** opcional
(gimnasio, comunicar…), que se crea sola a partir de las que ya has usado.

Todo se agrupa por días, del más reciente al más antiguo, con los últimos 30 días a la vista.
Esa es la idea: al escribir hoy ves debajo lo de los días anteriores y cuesta más dejar el día
en blanco. El subtítulo lleva la cuenta de los días seguidos apuntando algo.

**Otros días.** Desde el menú `⋯ → Mover a` (hoy, mañana, pasado mañana, dentro de una semana
o una fecha concreta). Lo que caiga en un día posterior aparece en **Futuras**.

## Arrancar

Backend (puerto 5065; crea `todo.db` la primera vez):

```bash
dotnet run --project server/TodoApp.Api --urls http://localhost:5065
```

Frontend (puerto 5173, con proxy de `/api` al backend):

```bash
npm --prefix web run dev
```

Abre <http://localhost:5173>.

Para empezar de cero, borra la base de datos:

```bash
rm server/TodoApp.Api/todo.db
```

## Desplegar en Fly.io

Todo va en **un solo contenedor**: el backend sirve la API y el React ya compilado desde
`wwwroot`, así que hay una única URL y no hay CORS ni variables en el front. Los datos son el
mismo SQLite de siempre, en un **volumen** montado en `/data`, que sobrevive a despliegues.

Coste: el volumen de 1 GB son $0,15/mes y la máquina `shared-cpu-1x` de 512 MB $3,32/mes si se
deja encendida. Con `auto_stop_machines = "suspend"` (lo que trae `fly.toml`) se suspende cuando
no la usas y **despierta en 200–500 ms**, así que solo pagas céntimos de cómputo. Si prefieres
arranque cero absoluto, pon `min_machines_running = 1`.

### Antes de nada: la contraseña

La app no tiene usuarios; tiene **una contraseña** en la variable `APP_PASSWORD`. Si está vacía
no hay candado (así es el desarrollo local); en cuanto tiene valor, la API rechaza con **401**
todo lo que no traiga la cookie, y el front muestra la pantalla de acceso. El navegador recuerda
la sesión un año, así que la escribes una vez por dispositivo. **Úsala larga**: es lo único que
separa tus datos de internet.

### Opción A — conectando el repositorio de GitHub

1. Subir el repo a GitHub **con `Dockerfile` y `fly.toml` dentro** (ya están), para que Fly use
   esta configuración en vez de adivinarla.
2. En Fly, *Launch an App from GitHub* → conectar la cuenta y elegir el repositorio.
3. Crear el volumen si el asistente no lo ha hecho: en el panel, *Volumes* → nombre
   `panificador_data`, 1 GB, región `cdg`.
4. En *Secrets*, añadir `APP_PASSWORD`.
5. Desde entonces, cada `git push` despliega (se activa en *Deployments → settings*).

### Opción B — desde el terminal

```bash
brew install flyctl
fly auth login
fly launch --no-deploy --name panificador --region cdg
fly volumes create panificador_data --size 1 --region cdg
fly secrets set APP_PASSWORD='una-contraseña-larga'
fly deploy
```

No hace falta Docker en local: `fly deploy` construye la imagen en el builder remoto de Fly.

### Mantenimiento

- **Una sola máquina, siempre.** SQLite admite un único escritor; `fly.toml` fija
  `max_machines_running = 1`.
- **Copia de seguridad**, que es un solo fichero:
  `fly ssh console -C "cat /data/todo.db" > todo-$(date +%F).db`. Fly además hace snapshots
  diarios del volumen (`fly volumes snapshots list <id>`).
- **Zona horaria**: la imagen fija `TZ=Europe/Madrid` porque el backend calcula "hoy" con la hora
  local; en UTC el arrastre de tareas se descuadraría de madrugada.
- **Esquema**: la base se crea y se actualiza con migraciones de EF Core al arrancar
  (`Database.Migrate()`). Para cambiar el modelo:
  `dotnet dotnet-ef migrations add NombreDelCambio --project server/TodoApp.Api`.

## API

Todas las fechas son `yyyy-MM-dd` y las manda el cliente, así que el "hoy" es siempre el
del navegador del usuario.

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/api/days/{date}` | Tareas del día: asignadas, arrastradas y completadas ese día |
| GET | `/api/days/{date}/hidden` | Lo ocultado "por hoy" en ese día |
| GET | `/api/upcoming` | Futuras: pendientes de días posteriores, agrupadas por día |
| GET | `/api/counts` | Contadores de la barra lateral |
| GET | `/api/archive` | Carpeta Archivo |
| GET | `/api/folders` | Carpetas del usuario con sus pendientes |
| GET | `/api/folders/{id}/tasks` | Todo lo de una carpeta |
| POST | `/api/folders` · PATCH `/{id}` · DELETE `/{id}` | Crear, renombrar/recolorear, borrar |
| POST | `/api/tasks` | Crear (`title`, `scheduledDate`, `priority`, `parentId`, `folderId`) |
| PATCH | `/api/tasks/{id}` | Editar título, notas, prioridad o fecha |
| POST | `/api/tasks/{id}/folder` | Mover de carpeta (`folderId: null` = sin carpeta) |
| POST | `/api/tasks/{id}/complete` \| `/uncomplete` | Marcar hecha/pendiente en una fecha |
| POST | `/api/tasks/{id}/archive` \| `/unarchive` | Mandar al archivo / devolver a un día |
| POST | `/api/tasks/{id}/hide` \| `/unhide` | Ocultar por un día / recuperar |
| POST | `/api/tasks/reorder` | Reordenar (lista de ids) |
| DELETE | `/api/tasks/{id}` | Borrar (las subtareas caen en cascada) |
| GET | `/api/habits?from=&to=` | Rejilla de hábitos con rachas y contadores |
| POST | `/api/habits` · PATCH `/{id}` · DELETE `/{id}` | Crear, renombrar/recolorear, borrar |
| POST | `/api/habits/{id}/entries` | Recorre el estado de un día (cumplido → saltado → nada) |
| POST | `/api/habits/reorder` | Reordenar la lista de hábitos (lista de ids) |
| GET | `/api/strengths?from=&to=` | Fortalezas por día, etiquetas usadas y cuántas van hoy |
| POST | `/api/strengths` · PATCH `/{id}` · DELETE `/{id}` | Apuntar, editar y borrar un momento |
| GET | `/api/auth/status` | `{ required, authenticated }` para saber si pedir contraseña |
| POST | `/api/auth/login` \| `/logout` | Entrar con la contraseña / borrar la cookie |
| GET | `/health` | Comprobación de vida (fuera del candado) |

## Estructura

```
Dockerfile                 front + backend en una sola imagen
fly.toml                   máquina, volumen y suspensión en Fly.io
server/TodoApp.Api/
  Program.cs               endpoints, candado y servido del SPA
  Auth.cs                  contraseña única y cookie
  Migrations/              esquema versionado (EF Core)
  Models/TodoTask.cs       entidad tarea
  Models/Folder.cs         carpetas del usuario
  Models/Habit.cs          hábitos y su registro de días
  Models/StrengthNote.cs   momentos de "he sido fuerte"
  Data/TodoDbContext.cs    EF Core
  TaskMapper.cs            estado relativo al día que se mira (arrastre, hecho hoy)
  HabitMapper.cs           rachas, contadores y límite de días saltados
  Dtos.cs
web/src/
  App.tsx                  layout con barra lateral y enrutado de vistas
  components/Sidebar.tsx   nombre de la app, Hoy / Futuras / Archivo / Hábitos y carpetas
  components/HabitsView.tsx  la rejilla de hábitos
  components/StrengthsView.tsx  la bitácora de fortalezas
  components/              TaskRow, DayView, UpcomingView, FolderView, ArchivePanel…
  components/ui/           primitivas estilo shadcn (button, dropdown-menu)
  hooks/                   React Query: useTasks, useHabits
  lib/                     api, fechas, prioridades, carpetas, colores de hábitos
```
