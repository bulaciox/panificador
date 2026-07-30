using Microsoft.EntityFrameworkCore;
using TodoApp.Api.Models;

namespace TodoApp.Api.Data;

public class TodoDbContext(DbContextOptions<TodoDbContext> options) : DbContext(options)
{
    public DbSet<TodoTask> Tasks => Set<TodoTask>();

    public DbSet<Folder> Folders => Set<Folder>();

    public DbSet<Habit> Habits => Set<Habit>();

    public DbSet<HabitEntry> HabitEntries => Set<HabitEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var task = modelBuilder.Entity<TodoTask>();

        task.HasKey(t => t.Id);
        task.Property(t => t.Title).IsRequired().HasMaxLength(500);
        task.Property(t => t.Notes).HasMaxLength(4000);
        task.Property(t => t.Priority).HasConversion<int>();

        task.HasMany(t => t.Children)
            .WithOne(t => t.Parent)
            .HasForeignKey(t => t.ParentId)
            .OnDelete(DeleteBehavior.Cascade);

        // Al borrar una carpeta sus tareas se quedan sin carpeta, no se pierden.
        task.HasOne(t => t.Folder)
            .WithMany(f => f.Tasks)
            .HasForeignKey(t => t.FolderId)
            .OnDelete(DeleteBehavior.SetNull);

        task.HasIndex(t => t.ScheduledDate);
        task.HasIndex(t => t.CompletedOn);
        task.HasIndex(t => t.IsArchived);
        task.HasIndex(t => t.ParentId);
        task.HasIndex(t => t.FolderId);

        var folder = modelBuilder.Entity<Folder>();
        folder.HasKey(f => f.Id);
        folder.Property(f => f.Name).IsRequired().HasMaxLength(120);
        folder.Property(f => f.Color).IsRequired().HasMaxLength(20);

        var habit = modelBuilder.Entity<Habit>();
        habit.HasKey(h => h.Id);
        habit.Property(h => h.Name).IsRequired().HasMaxLength(120);
        habit.Property(h => h.Color).IsRequired().HasMaxLength(20);

        habit.HasMany(h => h.Entries)
            .WithOne(e => e.Habit)
            .HasForeignKey(e => e.HabitId)
            .OnDelete(DeleteBehavior.Cascade);

        var entry = modelBuilder.Entity<HabitEntry>();
        entry.HasKey(e => e.Id);
        entry.Property(e => e.State).HasConversion<int>();
        // Un solo registro por hábito y día.
        entry.HasIndex(e => new { e.HabitId, e.Date }).IsUnique();
    }
}
