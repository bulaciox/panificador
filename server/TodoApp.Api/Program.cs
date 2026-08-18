using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using TodoApp.Api;
using TodoApp.Api.Data;
using TodoApp.Api.Models;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default") ?? "Data Source=todo.db";
builder.Services.AddDbContext<TodoDbContext>(options => options.UseSqlite(connectionString));

// En producción el propio backend sirve el front, así que no hay dos orígenes que permitir.
var isDevelopment = builder.Environment.IsDevelopment();
if (isDevelopment)
{
    builder.Services.AddCors(options =>
        options.AddDefaultPolicy(policy => policy
            .WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()));
}

var app = builder.Build();

// El volumen donde vive la base de datos puede venir recién montado y vacío.
EnsureDatabaseDirectory(connectionString);

using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<TodoDbContext>().Database.Migrate();
}

if (isDevelopment) app.UseCors();

// El front compilado viaja en wwwroot: una sola URL para la app y la API.
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// Candado: nada de /api sale sin cookie válida cuando hay APP_PASSWORD.
// Los ficheros estáticos siguen abiertos; el HTML y el JS no contienen datos.
app.Use(async (context, next) =>
{
    var password = Auth.Password(app.Configuration);
    var path = context.Request.Path;

    if (password is null
        || !path.StartsWithSegments("/api")
        || path.StartsWithSegments("/api/auth"))
    {
        await next();
        return;
    }

    if (!Auth.IsAuthenticated(context, password))
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        await context.Response.WriteAsJsonAsync(new { error = "Necesitas iniciar sesión." });
        return;
    }

    await next();
});

var api = app.MapGroup("/api");

// ---------------------------------------------------------------- acceso

api.MapGet("/auth/status", (HttpContext context) =>
{
    var password = Auth.Password(app.Configuration);
    return Results.Ok(new
    {
        required = password is not null,
        authenticated = password is null || Auth.IsAuthenticated(context, password)
    });
});

api.MapPost("/auth/login", async (LoginRequest req, HttpContext context) =>
{
    var password = Auth.Password(app.Configuration);
    if (password is null) return Results.Ok(new { authenticated = true });

    if (string.IsNullOrEmpty(req.Password) || !Auth.Matches(req.Password, password))
    {
        // Un pequeño freno para que probar contraseñas a lo bruto no salga gratis.
        await Task.Delay(400);
        return Results.Json(new { error = "Contraseña incorrecta." },
            statusCode: StatusCodes.Status401Unauthorized);
    }

    Auth.SignIn(context, password, secure: !isDevelopment);
    return Results.Ok(new { authenticated = true });
});

api.MapPost("/auth/logout", (HttpContext context) =>
{
    Auth.SignOut(context);
    return Results.NoContent();
});

// ---------------------------------------------------------------- consultas

// Vista de un día: lo asignado a ese día, lo que se arrastra de días anteriores
// (solo cuando miras hoy) y lo que se completó justo ese día.
api.MapGet("/days/{date}", async (DateOnly date, TodoDbContext db) =>
{
    var today = Today();
    var all = await db.Tasks.AsNoTracking().Where(t => !t.IsArchived).ToListAsync();

    bool BelongsToDay(TodoTask t) =>
        t.HiddenOn != date &&
        ((t.ScheduledDate == date && t.CompletedOn is null)
         || t.CompletedOn == date
         || (date == today && t.ScheduledDate < date && t.CompletedOn is null));

    var roots = all
        .Where(t => t.ParentId is null && BelongsToDay(t))
        .OrderBy(t => t.SortOrder)
        .ThenBy(t => t.CreatedAt)
        .ToList();

    var childrenByParent = TaskMapper.GroupChildren(all.Where(t => t.HiddenOn != date));

    var dtos = roots.Select(r => TaskMapper.ToDto(r, date, childrenByParent)).ToList();
    return Results.Ok(new DayDto(date, dtos));
});

// Lo que se ocultó "por hoy", para poder recuperarlo el mismo día.
api.MapGet("/days/{date}/hidden", async (DateOnly date, TodoDbContext db) =>
{
    var hidden = await db.Tasks.AsNoTracking()
        .Where(t => !t.IsArchived && t.HiddenOn == date && t.ParentId == null)
        .OrderBy(t => t.ScheduledDate)
        .ToListAsync();

    var dtos = hidden
        .Select(t => TaskMapper.ToDto(t, date, new Dictionary<Guid, List<TodoTask>>()))
        .ToList();

    return Results.Ok(dtos);
});

// "Futuras": todo lo pendiente de días posteriores a hoy, agrupado por día.
api.MapGet("/upcoming", async (TodoDbContext db) =>
{
    var today = Today();
    var all = await db.Tasks.AsNoTracking().Where(t => !t.IsArchived).ToListAsync();
    var childrenByParent = TaskMapper.GroupChildren(all);

    var groups = all
        .Where(t => t.ParentId is null && t.CompletedOn is null && t.ScheduledDate > today)
        .GroupBy(t => t.ScheduledDate)
        .OrderBy(group => group.Key)
        .Select(group => new DayDto(
            group.Key,
            group.OrderBy(t => t.SortOrder).ThenBy(t => t.CreatedAt)
                 .Select(t => TaskMapper.ToDto(t, group.Key, childrenByParent))
                 .ToList()))
        .ToList();

    return Results.Ok(groups);
});

// Contadores de la barra lateral.
api.MapGet("/counts", async (TodoDbContext db) =>
{
    var today = Today();
    var all = await db.Tasks.AsNoTracking().ToListAsync();

    var todayCount = all.Count(t => !t.IsArchived && t.CompletedOn is null &&
        t.HiddenOn != today && t.ScheduledDate <= today);
    var upcoming = all.Count(t => !t.IsArchived && t.CompletedOn is null && t.ScheduledDate > today);
    var archived = all.Count(t => t.IsArchived && t.ParentId is null);

    return Results.Ok(new CountsDto(todayCount, upcoming, archived));
});

// ---------------------------------------------------------------- fortalezas

// Momentos en los que se ha sido fuerte, agrupados por día (el más reciente primero)
// para poder repasar los últimos días de un vistazo.
api.MapGet("/strengths", async (DateOnly? from, DateOnly? to, TodoDbContext db) =>
{
    var today = Today();
    var until = to ?? today;
    var since = from ?? until.AddDays(-29);

    var all = await db.StrengthNotes.AsNoTracking().ToListAsync();

    var days = all
        .Where(note => note.Date >= since && note.Date <= until)
        .GroupBy(note => note.Date)
        .OrderByDescending(group => group.Key)
        .Select(group => new StrengthDayDto(
            group.Key,
            group.OrderByDescending(note => note.CreatedAt)
                 .Select(note => new StrengthNoteDto(note.Id, note.Text, note.Label, note.Date, note.CreatedAt))
                 .ToList()))
        .ToList();

    // Las etiquetas salen de todo el histórico: sirven para sugerir al escribir.
    var labels = all
        .Where(note => !string.IsNullOrWhiteSpace(note.Label))
        .GroupBy(note => note.Label!)
        .Select(group => new StrengthLabelDto(group.Key, group.Count()))
        .OrderByDescending(label => label.Count)
        .ThenBy(label => label.Name)
        .Take(12)
        .ToList();

    return Results.Ok(new StrengthFeedDto(days, labels, all.Count(note => note.Date == today)));
});

api.MapPost("/strengths", async (CreateStrengthRequest req, TodoDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(req.Text))
        return Results.BadRequest(new { error = "Escribe en qué has sido fuerte." });

    var note = new StrengthNote
    {
        Text = req.Text.Trim(),
        Label = string.IsNullOrWhiteSpace(req.Label) ? null : req.Label.Trim(),
        Date = req.Date ?? Today()
    };

    db.StrengthNotes.Add(note);
    await db.SaveChangesAsync();

    return Results.Created($"/api/strengths/{note.Id}",
        new StrengthNoteDto(note.Id, note.Text, note.Label, note.Date, note.CreatedAt));
});

api.MapPatch("/strengths/{id:guid}", async (Guid id, UpdateStrengthRequest req, TodoDbContext db) =>
{
    var note = await db.StrengthNotes.FindAsync(id);
    if (note is null) return Results.NotFound();

    if (req.Text is not null)
    {
        if (string.IsNullOrWhiteSpace(req.Text))
            return Results.BadRequest(new { error = "El texto no puede quedar vacío." });
        note.Text = req.Text.Trim();
    }

    // Cadena vacía = quitar la etiqueta.
    if (req.Label is not null)
        note.Label = string.IsNullOrWhiteSpace(req.Label) ? null : req.Label.Trim();

    await db.SaveChangesAsync();
    return Results.Ok(new StrengthNoteDto(note.Id, note.Text, note.Label, note.Date, note.CreatedAt));
});

api.MapDelete("/strengths/{id:guid}", async (Guid id, TodoDbContext db) =>
{
    var note = await db.StrengthNotes.FindAsync(id);
    if (note is null) return Results.NotFound();

    db.StrengthNotes.Remove(note);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// ---------------------------------------------------------------- carpetas

api.MapGet("/folders", async (TodoDbContext db) =>
{
    // SQLite no sabe ordenar por DateTimeOffset, así que el desempate se hace en memoria.
    var folders = (await db.Folders.AsNoTracking().ToListAsync())
        .OrderBy(f => f.SortOrder)
        .ThenBy(f => f.CreatedAt)
        .ToList();
    var pending = await db.Tasks.AsNoTracking()
        .Where(t => !t.IsArchived && t.CompletedOn == null && t.FolderId != null)
        .GroupBy(t => t.FolderId!.Value)
        .Select(g => new { FolderId = g.Key, Count = g.Count() })
        .ToListAsync();

    var counts = pending.ToDictionary(p => p.FolderId, p => p.Count);

    return Results.Ok(folders
        .Select(f => new FolderDto(f.Id, f.Name, f.Color, f.SortOrder,
            counts.TryGetValue(f.Id, out var count) ? count : 0))
        .ToList());
});

// Todo lo de una carpeta, sin importar el día.
api.MapGet("/folders/{id:guid}/tasks", async (Guid id, TodoDbContext db) =>
{
    if (!await db.Folders.AnyAsync(f => f.Id == id)) return Results.NotFound();

    var today = Today();
    var all = await db.Tasks.AsNoTracking().Where(t => !t.IsArchived && t.FolderId == id).ToListAsync();
    var childrenByParent = TaskMapper.GroupChildren(all);

    var roots = all
        .Where(t => t.ParentId is null)
        .OrderBy(t => t.ScheduledDate)
        .ThenBy(t => t.SortOrder)
        .Select(t => TaskMapper.ToDto(t, today, childrenByParent))
        .ToList();

    return Results.Ok(roots);
});

api.MapPost("/folders", async (CreateFolderRequest req, TodoDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(req.Name))
        return Results.BadRequest(new { error = "La carpeta necesita un nombre." });

    var count = await db.Folders.CountAsync();
    var folder = new Folder
    {
        Name = req.Name.Trim(),
        Color = string.IsNullOrWhiteSpace(req.Color) ? "blue" : req.Color.Trim(),
        SortOrder = count
    };

    db.Folders.Add(folder);
    await db.SaveChangesAsync();

    return Results.Created($"/api/folders/{folder.Id}",
        new FolderDto(folder.Id, folder.Name, folder.Color, folder.SortOrder, 0));
});

api.MapPatch("/folders/{id:guid}", async (Guid id, UpdateFolderRequest req, TodoDbContext db) =>
{
    var folder = await db.Folders.FindAsync(id);
    if (folder is null) return Results.NotFound();

    if (req.Name is not null)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return Results.BadRequest(new { error = "La carpeta necesita un nombre." });
        folder.Name = req.Name.Trim();
    }

    if (!string.IsNullOrWhiteSpace(req.Color)) folder.Color = req.Color.Trim();

    await db.SaveChangesAsync();
    return Results.Ok(new FolderDto(folder.Id, folder.Name, folder.Color, folder.SortOrder, 0));
});

// Borrar la carpeta no borra sus tareas: se quedan sin carpeta.
api.MapDelete("/folders/{id:guid}", async (Guid id, TodoDbContext db) =>
{
    var folder = await db.Folders.FindAsync(id);
    if (folder is null) return Results.NotFound();

    foreach (var task in await db.Tasks.Where(t => t.FolderId == id).ToListAsync())
        task.FolderId = null;

    db.Folders.Remove(folder);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// Carpeta "Archivo".
api.MapGet("/archive", async (TodoDbContext db) =>
{
    var archived = await db.Tasks.AsNoTracking().Where(t => t.IsArchived).ToListAsync();
    var childrenByParent = TaskMapper.GroupChildren(archived);
    var today = Today();

    // Raíz del archivo = tarea archivada cuyo padre no está archivado (o no tiene padre).
    var roots = archived
        .Where(t => t.ParentId is null || archived.All(a => a.Id != t.ParentId))
        .OrderByDescending(t => t.ArchivedAt)
        .Select(t => TaskMapper.ToDto(t, today, childrenByParent))
        .ToList();

    return Results.Ok(roots);
});

// ---------------------------------------------------------------- hábitos
// Los hábitos no tienen nada que ver con las tareas: ni fecha de vencimiento, ni
// carpeta, ni arrastre. Solo la rejilla de días cumplidos.

api.MapGet("/habits", async (DateOnly? from, DateOnly? to, TodoDbContext db) =>
{
    var today = Today();
    var end = to ?? today;
    var start = from ?? end.AddDays(-13);

    var habits = (await db.Habits.AsNoTracking().ToListAsync())
        .OrderBy(h => h.SortOrder)
        .ThenBy(h => h.CreatedAt)
        .ToList();

    var entries = await db.HabitEntries.AsNoTracking().ToListAsync();

    var dtos = habits
        .Select(h => HabitMapper.ToDto(
            h,
            entries.Where(e => e.HabitId == h.Id).ToList(),
            start,
            end,
            today))
        .ToList();

    return Results.Ok(dtos);
});

api.MapPost("/habits", async (CreateHabitRequest req, TodoDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(req.Name))
        return Results.BadRequest(new { error = "El hábito necesita un nombre." });

    var count = await db.Habits.CountAsync();
    var habit = new Habit
    {
        Name = req.Name.Trim(),
        Color = string.IsNullOrWhiteSpace(req.Color) ? "red" : req.Color.Trim(),
        SortOrder = count
    };

    db.Habits.Add(habit);
    await db.SaveChangesAsync();

    var today = Today();
    return Results.Created($"/api/habits/{habit.Id}",
        HabitMapper.ToDto(habit, [], today.AddDays(-13), today, today));
});

api.MapPatch("/habits/{id:guid}", async (Guid id, UpdateHabitRequest req, TodoDbContext db) =>
{
    var habit = await db.Habits.FindAsync(id);
    if (habit is null) return Results.NotFound();

    if (req.Name is not null)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return Results.BadRequest(new { error = "El hábito necesita un nombre." });
        habit.Name = req.Name.Trim();
    }

    if (!string.IsNullOrWhiteSpace(req.Color)) habit.Color = req.Color.Trim();

    await db.SaveChangesAsync();
    return Results.NoContent();
});

// Reordenar la lista de hábitos (el orden lo decide el usuario arrastrando).
api.MapPost("/habits/reorder", async (ReorderRequest req, TodoDbContext db) =>
{
    var habits = await db.Habits.Where(h => req.OrderedIds.Contains(h.Id)).ToListAsync();
    for (var i = 0; i < req.OrderedIds.Count; i++)
    {
        var habit = habits.FirstOrDefault(h => h.Id == req.OrderedIds[i]);
        if (habit is not null) habit.SortOrder = i;
    }

    await db.SaveChangesAsync();
    return Results.NoContent();
});

api.MapDelete("/habits/{id:guid}", async (Guid id, TodoDbContext db) =>
{
    var habit = await db.Habits.FindAsync(id);
    if (habit is null) return Results.NotFound();

    db.Habits.Remove(habit); // los registros de días caen en cascada
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// Un clic recorre los tres estados del día: sin marcar → cumplido → saltado → sin marcar.
api.MapPost("/habits/{id:guid}/entries", async (Guid id, HabitEntryRequest? req, TodoDbContext db) =>
{
    var habit = await db.Habits.FindAsync(id);
    if (habit is null) return Results.NotFound();

    var today = Today();
    var date = req?.Date ?? today;
    if (date > today)
        return Results.BadRequest(new { error = "Todavía no puedes marcar un día que no ha llegado." });

    var entries = await db.HabitEntries.Where(e => e.HabitId == id).ToListAsync();
    var entry = entries.FirstOrDefault(e => e.Date == date);

    if (entry is null)
    {
        db.HabitEntries.Add(new HabitEntry { HabitId = id, Date = date, State = HabitEntryState.Done });
    }
    else if (entry.State == HabitEntryState.Done)
    {
        var byDate = entries.ToDictionary(e => e.Date, e => e.State);
        if (HabitMapper.SkipRunLength(byDate, date) > HabitMapper.MaxConsecutiveSkips)
        {
            return Results.BadRequest(new
            {
                error = $"No puedes saltarte más de {HabitMapper.MaxConsecutiveSkips} días seguidos."
            });
        }

        entry.State = HabitEntryState.Skipped;
    }
    else
    {
        db.HabitEntries.Remove(entry);
    }

    await db.SaveChangesAsync();
    return Results.NoContent();
});

// ---------------------------------------------------------------- mutaciones

api.MapPost("/tasks", async (CreateTaskRequest req, TodoDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(req.Title))
        return Results.BadRequest(new { error = "El título no puede estar vacío." });

    TodoTask? parent = null;
    if (req.ParentId is Guid parentId)
    {
        parent = await db.Tasks.FindAsync(parentId);
        if (parent is null) return Results.NotFound(new { error = "La tarea padre no existe." });
    }

    // Las subtareas viven en el día y la carpeta de su tarea padre.
    var date = parent?.ScheduledDate ?? req.ScheduledDate ?? Today();
    var folderId = parent is not null ? parent.FolderId : req.FolderId;

    if (folderId is Guid fid && !await db.Folders.AnyAsync(f => f.Id == fid))
        return Results.NotFound(new { error = "La carpeta no existe." });

    var siblings = await db.Tasks
        .Where(t => t.ParentId == req.ParentId && t.ScheduledDate == date)
        .ToListAsync();

    var task = new TodoTask
    {
        Title = req.Title.Trim(),
        Notes = req.Notes,
        ScheduledDate = date,
        Priority = req.Priority ?? Priority.None,
        FolderId = folderId,
        ParentId = req.ParentId,
        SortOrder = siblings.Count == 0 ? 0 : siblings.Max(s => s.SortOrder) + 1
    };

    db.Tasks.Add(task);
    await db.SaveChangesAsync();

    return Results.Created($"/api/tasks/{task.Id}", TaskMapper.ToDto(task, date, new Dictionary<Guid, List<TodoTask>>()));
});

api.MapPatch("/tasks/{id:guid}", async (Guid id, UpdateTaskRequest req, TodoDbContext db) =>
{
    var task = await db.Tasks.FindAsync(id);
    if (task is null) return Results.NotFound();

    if (req.Title is not null)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
            return Results.BadRequest(new { error = "El título no puede estar vacío." });
        task.Title = req.Title.Trim();
    }

    if (req.Notes is not null) task.Notes = req.Notes;
    if (req.Priority is Priority p) task.Priority = p;

    // Reasignar a otro día arrastra también a las subtareas.
    if (req.ScheduledDate is DateOnly newDate && newDate != task.ScheduledDate)
    {
        task.ScheduledDate = newDate;
        task.HiddenOn = null;
        // El plan quedaba anclado a la fecha vieja; se limpia para que no aparezca en otro día.
        task.PlannedOn = null;
        task.StartTime = null;
        task.DurationMinutes = null;
        foreach (var child in await DescendantsAsync(db, task.Id))
        {
            child.ScheduledDate = newDate;
            child.HiddenOn = null;
            child.PlannedOn = null;
            child.StartTime = null;
            child.DurationMinutes = null;
        }
    }

    await db.SaveChangesAsync();
    return Results.Ok(await LoadDtoAsync(db, task.Id, task.ScheduledDate));
});

// Mover a una carpeta (o sacarla de todas con folderId = null). Arrastra a las subtareas.
api.MapPost("/tasks/{id:guid}/folder", async (Guid id, FolderRequest req, TodoDbContext db) =>
{
    var task = await db.Tasks.FindAsync(id);
    if (task is null) return Results.NotFound();

    if (req.FolderId is Guid folderId && !await db.Folders.AnyAsync(f => f.Id == folderId))
        return Results.NotFound(new { error = "La carpeta no existe." });

    task.FolderId = req.FolderId;
    foreach (var child in await DescendantsAsync(db, task.Id))
        child.FolderId = req.FolderId;

    await db.SaveChangesAsync();
    return Results.Ok(await LoadDtoAsync(db, task.Id, task.ScheduledDate));
});

// Marcar hecha: se guarda el día en que se hizo, que es lo que permite pintarla
// distinta si se hizo justo el día que estás mirando.
api.MapPost("/tasks/{id:guid}/complete", async (Guid id, DateRequest? req, TodoDbContext db) =>
{
    var task = await db.Tasks.FindAsync(id);
    if (task is null) return Results.NotFound();

    var when = req?.Date ?? Today();
    task.CompletedOn = when;
    task.CompletedAt = DateTimeOffset.Now;

    foreach (var child in await DescendantsAsync(db, task.Id))
    {
        if (child.CompletedOn is null)
        {
            child.CompletedOn = when;
            child.CompletedAt = DateTimeOffset.Now;
        }
    }

    await db.SaveChangesAsync();
    return Results.Ok(await LoadDtoAsync(db, task.Id, when));
});

api.MapPost("/tasks/{id:guid}/uncomplete", async (Guid id, DateRequest? req, TodoDbContext db) =>
{
    var task = await db.Tasks.FindAsync(id);
    if (task is null) return Results.NotFound();

    task.CompletedOn = null;
    task.CompletedAt = null;

    // Si una subtarea se reabre, sus padres no pueden seguir hechos.
    var parentId = task.ParentId;
    while (parentId is Guid pid)
    {
        var parent = await db.Tasks.FindAsync(pid);
        if (parent is null) break;
        parent.CompletedOn = null;
        parent.CompletedAt = null;
        parentId = parent.ParentId;
    }

    await db.SaveChangesAsync();
    return Results.Ok(await LoadDtoAsync(db, task.Id, req?.Date ?? Today()));
});

// Mandar a la carpeta Archivo (con sus subtareas).
api.MapPost("/tasks/{id:guid}/archive", async (Guid id, TodoDbContext db) =>
{
    var task = await db.Tasks.FindAsync(id);
    if (task is null) return Results.NotFound();

    var now = DateTimeOffset.Now;
    task.IsArchived = true;
    task.ArchivedAt = now;

    foreach (var child in await DescendantsAsync(db, task.Id))
    {
        child.IsArchived = true;
        child.ArchivedAt = now;
    }

    await db.SaveChangesAsync();
    return Results.NoContent();
});

// Sacar del archivo y devolverla a un día (por defecto, hoy).
api.MapPost("/tasks/{id:guid}/unarchive", async (Guid id, DateRequest? req, TodoDbContext db) =>
{
    var task = await db.Tasks.FindAsync(id);
    if (task is null) return Results.NotFound();

    var date = req?.Date ?? Today();
    task.IsArchived = false;
    task.ArchivedAt = null;
    task.HiddenOn = null;
    task.ScheduledDate = date;

    foreach (var child in await DescendantsAsync(db, task.Id))
    {
        child.IsArchived = false;
        child.ArchivedAt = null;
        child.HiddenOn = null;
        child.ScheduledDate = date;
    }

    await db.SaveChangesAsync();
    return Results.Ok(await LoadDtoAsync(db, task.Id, date));
});

// "Que desaparezca por hoy": se oculta solo ese día y vuelve al siguiente.
api.MapPost("/tasks/{id:guid}/hide", async (Guid id, DateRequest? req, TodoDbContext db) =>
{
    var task = await db.Tasks.FindAsync(id);
    if (task is null) return Results.NotFound();

    var date = req?.Date ?? Today();
    task.HiddenOn = date;
    foreach (var child in await DescendantsAsync(db, task.Id))
        child.HiddenOn = date;

    await db.SaveChangesAsync();
    return Results.NoContent();
});

api.MapPost("/tasks/{id:guid}/unhide", async (Guid id, TodoDbContext db) =>
{
    var task = await db.Tasks.FindAsync(id);
    if (task is null) return Results.NotFound();

    task.HiddenOn = null;
    foreach (var child in await DescendantsAsync(db, task.Id))
        child.HiddenOn = null;

    await db.SaveChangesAsync();
    return Results.NoContent();
});

// Planificar: asigna hora de inicio y duración al bloque de agenda de un día.
// No bloquea solapamientos: si hay dos tareas a la misma hora se muestran en columnas.
api.MapPost("/tasks/{id:guid}/plan", async (Guid id, PlanRequest req, TodoDbContext db) =>
{
    var task = await db.Tasks.FindAsync(id);
    if (task is null) return Results.NotFound();
    if (task.IsArchived) return Results.BadRequest(new { error = "Una tarea archivada no se puede planificar." });

    if (!TimeOnly.TryParseExact(req.StartTime, "HH:mm", out var startTime))
        return Results.BadRequest(new { error = "La hora de inicio no tiene el formato correcto (HH:mm)." });

    if (req.DurationMinutes < 5 || req.DurationMinutes > 720 || req.DurationMinutes % 5 != 0)
        return Results.BadRequest(new { error = "La duración debe ser un múltiplo de 5 entre 5 y 720 minutos." });

    var endMinutes = startTime.Hour * 60 + startTime.Minute + req.DurationMinutes;
    if (endMinutes > 1440)
        return Results.BadRequest(new { error = "El bloque no cabe en el día (cruza la medianoche)." });

    var date = req.Date ?? Today();
    task.PlannedOn = date;
    task.StartTime = startTime;
    task.DurationMinutes = req.DurationMinutes;

    await db.SaveChangesAsync();
    return Results.Ok(await LoadDtoAsync(db, task.Id, date));
});

// Quitar de la agenda: el bloque desaparece del raíl pero la tarea sigue en la lista.
api.MapPost("/tasks/{id:guid}/unplan", async (Guid id, TodoDbContext db) =>
{
    var task = await db.Tasks.FindAsync(id);
    if (task is null) return Results.NotFound();

    task.PlannedOn = null;
    task.StartTime = null;
    task.DurationMinutes = null;

    await db.SaveChangesAsync();
    return Results.NoContent();
});

api.MapPost("/tasks/reorder", async (ReorderRequest req, TodoDbContext db) =>
{
    var tasks = await db.Tasks.Where(t => req.OrderedIds.Contains(t.Id)).ToListAsync();
    for (var i = 0; i < req.OrderedIds.Count; i++)
    {
        var task = tasks.FirstOrDefault(t => t.Id == req.OrderedIds[i]);
        if (task is not null) task.SortOrder = i;
    }

    await db.SaveChangesAsync();
    return Results.NoContent();
});

api.MapDelete("/tasks/{id:guid}", async (Guid id, TodoDbContext db) =>
{
    var task = await db.Tasks.FindAsync(id);
    if (task is null) return Results.NotFound();

    db.Tasks.Remove(task); // las subtareas caen en cascada
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// Cualquier ruta que no sea de la API la resuelve el SPA.
app.MapFallbackToFile("index.html");

app.Run();

static DateOnly Today() => DateOnly.FromDateTime(DateTime.Now);

/// <summary>Crea la carpeta del fichero SQLite si no existe (volumen recién montado).</summary>
static void EnsureDatabaseDirectory(string connectionString)
{
    var dataSource = new SqliteConnectionStringBuilder(connectionString).DataSource;
    if (string.IsNullOrWhiteSpace(dataSource) || dataSource == ":memory:") return;

    var directory = Path.GetDirectoryName(Path.GetFullPath(dataSource));
    if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
}

// Descendientes de una tarea, para completar / archivar / mover en cascada.
static async Task<List<TodoTask>> DescendantsAsync(TodoDbContext db, Guid rootId)
{
    var result = new List<TodoTask>();
    var frontier = new List<Guid> { rootId };

    while (frontier.Count > 0)
    {
        var children = await db.Tasks
            .Where(t => t.ParentId != null && frontier.Contains(t.ParentId!.Value))
            .ToListAsync();

        if (children.Count == 0) break;
        result.AddRange(children);
        frontier = children.Select(c => c.Id).ToList();
    }

    return result;
}

static async Task<TaskDto?> LoadDtoAsync(TodoDbContext db, Guid id, DateOnly viewedDate)
{
    var task = await db.Tasks.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
    if (task is null) return null;

    var descendants = await DescendantsAsync(db, id);
    return TaskMapper.ToDto(task, viewedDate, TaskMapper.GroupChildren(descendants));
}
