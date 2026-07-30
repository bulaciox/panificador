namespace TodoApp.Api.Models;

public enum Priority
{
    None = 0,
    Low = 1,
    Medium = 2,
    High = 3
}

public class TodoTask
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Title { get; set; } = string.Empty;

    public string? Notes { get; set; }

    /// <summary>Día al que está asignada la tarea. Si pasa el día sin completarse, se arrastra a hoy.</summary>
    public DateOnly ScheduledDate { get; set; }

    /// <summary>Día en el que se marcó como hecha (null = pendiente).</summary>
    public DateOnly? CompletedOn { get; set; }

    public DateTimeOffset? CompletedAt { get; set; }

    public Priority Priority { get; set; } = Priority.None;

    public bool IsArchived { get; set; }

    public DateTimeOffset? ArchivedAt { get; set; }

    /// <summary>Día concreto en el que el usuario decidió ocultarla ("que desaparezca por hoy"). Reaparece al día siguiente.</summary>
    public DateOnly? HiddenOn { get; set; }

    /// <summary>Carpeta del usuario. null = sin carpeta.</summary>
    public Guid? FolderId { get; set; }

    public Folder? Folder { get; set; }

    public Guid? ParentId { get; set; }

    public TodoTask? Parent { get; set; }

    public List<TodoTask> Children { get; set; } = [];

    public int SortOrder { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public bool IsCompleted => CompletedOn is not null;
}
