using TodoApp.Api.Models;

namespace TodoApp.Api;

public record TaskDto(
    Guid Id,
    string Title,
    string? Notes,
    DateOnly ScheduledDate,
    DateOnly? CompletedOn,
    Priority Priority,
    bool IsArchived,
    DateOnly? HiddenOn,
    Guid? FolderId,
    Guid? ParentId,
    int SortOrder,
    bool IsCompleted,
    /// <summary>La tarea viene de un día anterior y sigue pendiente.</summary>
    bool CarriedOver,
    /// <summary>Cuántos días lleva arrastrándose (0 si es del día que se está viendo).</summary>
    int DaysCarried,
    /// <summary>Se completó justamente en el día que se está viendo (se pinta más clarita, sin tachar).</summary>
    bool CompletedOnViewedDay,
    List<TaskDto> Children
);

public record DayDto(DateOnly Date, List<TaskDto> Tasks);

public record FolderDto(Guid Id, string Name, string Color, int SortOrder, int Pending);

/// <summary>Contadores de la barra lateral.</summary>
public record CountsDto(int Today, int Upcoming, int Archived);

public record CreateTaskRequest(
    string Title,
    DateOnly? ScheduledDate,
    Priority? Priority,
    Guid? ParentId,
    Guid? FolderId,
    string? Notes
);

public record UpdateTaskRequest(
    string? Title,
    string? Notes,
    Priority? Priority,
    DateOnly? ScheduledDate
);

public record DateRequest(DateOnly? Date);

public record FolderRequest(Guid? FolderId);

public record ReorderRequest(List<Guid> OrderedIds);

public record CreateFolderRequest(string Name, string? Color);

public record UpdateFolderRequest(string? Name, string? Color);

// ---------------------------------------------------------------------- hábitos

/// <summary>
/// Un día de la rejilla. State null = sin marcar. Streak es el número de días
/// encadenados hasta ese día, que es lo que decide la intensidad del color.
/// </summary>
public record HabitDayDto(DateOnly Date, HabitEntryState? State, int Streak);

public record HabitDto(
    Guid Id,
    string Name,
    string Color,
    int SortOrder,
    int WeekCount,
    int MonthCount,
    int YearCount,
    List<HabitDayDto> Days
);

public record CreateHabitRequest(string Name, string? Color);

public record UpdateHabitRequest(string? Name, string? Color);

public record HabitEntryRequest(DateOnly? Date);

public record LoginRequest(string Password);

// ---------------------------------------------------------------- fortalezas

public record StrengthNoteDto(Guid Id, string Text, string? Label, DateOnly Date, DateTimeOffset CreatedAt);

public record StrengthDayDto(DateOnly Date, List<StrengthNoteDto> Notes);

/// <summary>Etiqueta ya usada, para ofrecerla al escribir y ver en qué se es fuerte.</summary>
public record StrengthLabelDto(string Name, int Count);

public record StrengthFeedDto(List<StrengthDayDto> Days, List<StrengthLabelDto> Labels, int TodayCount);

public record CreateStrengthRequest(string Text, string? Label, DateOnly? Date);

public record UpdateStrengthRequest(string? Text, string? Label);
