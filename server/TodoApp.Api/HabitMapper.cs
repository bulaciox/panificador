using TodoApp.Api.Models;

namespace TodoApp.Api;

public static class HabitMapper
{
    /// <summary>Máximo de días saltados seguidos que mantienen la racha viva.</summary>
    public const int MaxConsecutiveSkips = 2;

    /// <summary>
    /// Construye la fila de la rejilla de un hábito entre dos fechas.
    /// La racha se calcula desde el primer registro del hábito (no desde <paramref name="from"/>),
    /// porque el color de los días visibles depende de lo que haya pasado antes.
    /// </summary>
    public static HabitDto ToDto(
        Habit habit,
        IReadOnlyList<HabitEntry> entries,
        DateOnly from,
        DateOnly to,
        DateOnly today)
    {
        var byDate = entries.ToDictionary(e => e.Date, e => e.State);

        var walkStart = entries.Count > 0
            ? Min(entries.Min(e => e.Date), from)
            : from;

        var days = new List<HabitDayDto>();
        var streak = 0;

        for (var date = walkStart; date <= to; date = date.AddDays(1))
        {
            HabitEntryState? state = byDate.TryGetValue(date, out var found) ? found : null;

            streak = state switch
            {
                // Cumplido: la racha sube.
                HabitEntryState.Done => streak + 1,
                // Saltado: la racha se conserva tal cual (pero al menos vale 1 para que se vea).
                HabitEntryState.Skipped => Math.Max(streak, 1),
                // Sin marcar: se rompe.
                _ => 0
            };

            if (date >= from)
            {
                days.Add(new HabitDayDto(date, state, state is null ? 0 : Math.Max(streak, 1)));
            }
        }

        var doneDates = entries
            .Where(e => e.State == HabitEntryState.Done)
            .Select(e => e.Date)
            .ToList();

        var weekStart = StartOfWeek(today);
        var weekEnd = weekStart.AddDays(6);

        return new HabitDto(
            habit.Id,
            habit.Name,
            habit.Color,
            habit.SortOrder,
            doneDates.Count(d => d >= weekStart && d <= weekEnd),
            doneDates.Count(d => d.Year == today.Year && d.Month == today.Month),
            doneDates.Count(d => d.Year == today.Year),
            days
        );
    }

    /// <summary>
    /// Cuántos días saltados seguidos habría si se marcase <paramref name="date"/> como saltado,
    /// contando hacia atrás y hacia delante. Sirve para no dejar pasar más de dos.
    /// </summary>
    public static int SkipRunLength(IReadOnlyDictionary<DateOnly, HabitEntryState> byDate, DateOnly date)
    {
        var length = 1;

        for (var d = date.AddDays(-1);
             byDate.TryGetValue(d, out var before) && before == HabitEntryState.Skipped;
             d = d.AddDays(-1))
        {
            length++;
        }

        for (var d = date.AddDays(1);
             byDate.TryGetValue(d, out var after) && after == HabitEntryState.Skipped;
             d = d.AddDays(1))
        {
            length++;
        }

        return length;
    }

    /// <summary>Lunes de la semana de esa fecha.</summary>
    public static DateOnly StartOfWeek(DateOnly date) =>
        date.AddDays(-(((int)date.DayOfWeek + 6) % 7));

    private static DateOnly Min(DateOnly a, DateOnly b) => a < b ? a : b;
}
