namespace TodoApp.Api.Models;

/// <summary>Carpeta creada por el usuario para agrupar tareas de un tema concreto.</summary>
public class Folder
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = string.Empty;

    /// <summary>Nombre de color del punto de la carpeta (blue, violet, green, amber, rose, teal).</summary>
    public string Color { get; set; } = "blue";

    public int SortOrder { get; set; }

    /// <summary>Excluye las tareas de esta carpeta de Hoy, Futuras y contadores globales.</summary>
    public bool IsExcluded { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.Now;

    public List<TodoTask> Tasks { get; set; } = [];
}
