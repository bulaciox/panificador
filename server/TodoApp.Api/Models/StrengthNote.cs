namespace TodoApp.Api.Models;

/// <summary>
/// Un momento en el que el usuario fue fuerte: resistir algo que quiere romper (porno, un mal
/// hábito) o hacer algo que le cuesta (ir al gimnasio, decir lo que piensa). Es texto libre
/// anclado a un día, para poder repasar los últimos días y no perder la inercia.
/// </summary>
public class StrengthNote
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Text { get; set; } = string.Empty;

    /// <summary>Etiqueta libre para agrupar (gimnasio, comunicar…). null = sin etiqueta.</summary>
    public string? Label { get; set; }

    /// <summary>Día al que pertenece el momento.</summary>
    public DateOnly Date { get; set; }

    /// <summary>Hora exacta, para mostrar cuándo del día ocurrió.</summary>
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.Now;
}
