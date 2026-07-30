namespace TodoApp.Api.Models;

/// <summary>
/// Hábito diario. Vive completamente aparte de las tareas: no tiene fecha de vencimiento
/// ni carpeta, solo un registro de días cumplidos.
/// </summary>
public class Habit
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = string.Empty;

    /// <summary>Familia de color de la fila (red, amber, teal, blue, violet, green).</summary>
    public string Color { get; set; } = "red";

    public int SortOrder { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.Now;

    public List<HabitEntry> Entries { get; set; } = [];
}

public enum HabitEntryState
{
    /// <summary>Día cumplido: sube la intensidad del color.</summary>
    Done = 1,

    /// <summary>Día saltado: mantiene el color pero no lo sube. Máximo dos seguidos.</summary>
    Skipped = 2
}

public class HabitEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid HabitId { get; set; }

    public Habit? Habit { get; set; }

    public DateOnly Date { get; set; }

    public HabitEntryState State { get; set; } = HabitEntryState.Done;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.Now;
}
