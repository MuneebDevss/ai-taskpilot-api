class ConflictService {
  findTimeConflicts(newTask, existingTasks) {
    if (!newTask.start_date) {
      return [];
    }

    const conflicts = [];
    const newStartTime = new Date(newTask.start_date);
    const newEndTime = new Date(newStartTime.getTime() + (newTask.duration * 60 * 1000));

    existingTasks.forEach(task => {
      if (task.start_date && task.status !== 'Completed') {
        const taskStartTime = new Date(task.start_date);
        const taskEndTime = new Date(taskStartTime.getTime() + (task.duration * 60 * 1000));

        if (newStartTime < taskEndTime && newEndTime > taskStartTime) {
          conflicts.push(task);
        }
      }
    });

    return conflicts;
  }

  suggestAlternativeTimes(originalTime, duration, existingTasks) {
    const suggestions = [];
    const baseTime = new Date(originalTime);

    // Suggest times: 1 hour before, 1 hour after, next day same time
    const alternatives = [
      new Date(baseTime.getTime() - 60 * 60 * 1000), // 1 hour before
      new Date(baseTime.getTime() + 60 * 60 * 1000), // 1 hour after
      new Date(baseTime.getTime() + 24 * 60 * 60 * 1000) // Next day
    ];

    alternatives.forEach(altTime => {
      const mockTask = { startDate: altTime.toISOString(), duration };
      const conflicts = this.findTimeConflicts(mockTask, existingTasks);

      if (conflicts.length === 0) {
        suggestions.push({
          time: altTime.toISOString(),
          description: this.formatTimeDescription(altTime, baseTime)
        });
      }
    });

    return suggestions;
  }

  formatTimeDescription(newTime, originalTime) {
    const diffHours = Math.abs(newTime - originalTime) / (1000 * 60 * 60);

    if (diffHours < 24) {
      return diffHours === 1 ?
        (newTime > originalTime ? '1 hour later' : '1 hour earlier') :
        `${Math.round(diffHours)} hours ${newTime > originalTime ? 'later' : 'earlier'}`;
    } else {
      const diffDays = Math.round(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? 's' : ''} later`;
    }
  }
}
export default ConflictService;
