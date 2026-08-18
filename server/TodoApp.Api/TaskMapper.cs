using TodoApp.Api.Models;

namespace TodoApp.Api;

public static class TaskMapper
{
    /// <summary>
    /// Convierte una tarea (y sus hijas) al DTO, calculando el estado relativo al día que se está viendo:
    /// si viene arrastrada de días anteriores y si se completó justo ese día.
    /// </summary>
    public static TaskDto ToDto(TodoTask task, DateOnly viewedDate, IReadOnlyDictionary<Guid, List<TodoTask>> childrenByParent)
    {
        var carriedOver = task.CompletedOn is null && task.ScheduledDate < viewedDate;
        var daysCarried = carriedOver ? viewedDate.DayNumber - task.ScheduledDate.DayNumber : 0;

        var children = childrenByParent.TryGetValue(task.Id, out var kids)
            ? kids.OrderBy(c => c.SortOrder).ThenBy(c => c.CreatedAt)
                  .Select(c => ToDto(c, viewedDate, childrenByParent)).ToList()
            : [];

        // El plan solo aplica al día que se está viendo.
        var hasplan = task.PlannedOn == viewedDate && task.StartTime is not null && task.DurationMinutes is not null;

        return new TaskDto(
            task.Id,
            task.Title,
            task.Notes,
            task.ScheduledDate,
            task.CompletedOn,
            task.Priority,
            task.IsArchived,
            task.HiddenOn,
            task.FolderId,
            task.ParentId,
            task.SortOrder,
            task.CompletedOn is not null,
            carriedOver,
            daysCarried,
            task.CompletedOn == viewedDate,
            children,
            hasplan ? task.StartTime!.Value.ToString("HH:mm") : null,
            hasplan ? task.DurationMinutes : null
        );
    }

    public static Dictionary<Guid, List<TodoTask>> GroupChildren(IEnumerable<TodoTask> all)
    {
        var map = new Dictionary<Guid, List<TodoTask>>();
        foreach (var t in all.Where(t => t.ParentId is not null))
        {
            if (!map.TryGetValue(t.ParentId!.Value, out var list))
            {
                list = [];
                map[t.ParentId!.Value] = list;
            }
            list.Add(t);
        }
        return map;
    }
}
