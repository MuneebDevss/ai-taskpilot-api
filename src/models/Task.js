class Task {
  constructor(data = {}) {
    this.id = data.id || '';
    this.title = data.title || '';
    this.description = data.description || '';
    this.category = data.category || 'Personal';
    this.priority = data.priority || 'Medium';
    this.startDate = data.startDate || null;
    this.duration = data.duration || 30; // in minutes
    this.status = data.status || 'Pending';
    this.location = data.location || '';
    this.notes = data.notes || '';
    this.recurrence = data.recurrence || {
      type: 'none',
      interval: 1,
      daysOfWeek: [],
      endDate: null
    };
    this.reminders = data.reminders || [{
      type: 'Daily',
      minutesBefore: 15
    }];
    this.collaboration = data.collaboration || {
      isShared: false,
      sharedWith: []
    };
    this.createdAt = data.created_at || new Date().toISOString();
    this.updatedAt = data.updated_at || new Date().toISOString();
  }

  validate() {
    const errors = [];

    if (!this.title.trim()) {
      errors.push('Title is required');
    }

    if (!this.userId) {
      errors.push('User ID is required');
    }

    if (!['Personal', 'Work', 'Health', 'Education', 'Shopping', 'Travel', 'Entertainment'].includes(this.category)) {
      errors.push('Invalid category');
    }

    if (!['Low', 'Medium', 'High', 'Urgent'].includes(this.priority)) {
      errors.push('Invalid priority');
    }

    return errors;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      category: this.category,
      priority: this.priority,
      startDate: this.startDate,
      duration: this.duration,
      status: this.status,
      location: this.location,
      notes: this.notes,
      recurrence: this.recurrence,
      reminders: this.reminders,
      collaboration: this.collaboration,
      createdAt: this.created_at,
      updatedAt: this.updated_at
    };
  }
}
export default Task;
