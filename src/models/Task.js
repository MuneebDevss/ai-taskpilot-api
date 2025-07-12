class Task {
  constructor(data = {}) {
    this.id = data.id || '';
    this.userId = data.userId || '';
    this.title = data.title || '';
    this.description = data.description || '';
    this.category = data.category || 'Personal';
    this.priority = data.priority || 'Medium';
    this.start_date = data.start_date || null;
    this.duration = data.duration || 30; // in minutes
    this.status = data.status || 'Pending';
    this.location = data.location || '';
    this.notes = data.notes || '';
    this.recurrence = data.recurrence || {
      type: 'none',
      interval: 1,
      days_of_week: [],
      end_date: null
    };
    this.reminders = data.reminders || [{
      type: 'Daily',
      minutes_before: 15
    }];
    this.collaboration = data.collaboration || {
      is_shared: false,
      shared_with: []
    };
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
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
      userId: this.userId,
      title: this.title,
      description: this.description,
      category: this.category,
      priority: this.priority,
      start_date: this.start_date,
      duration: this.duration,
      status: this.status,
      location: this.location,
      notes: this.notes,
      recurrence: this.recurrence,
      reminders: this.reminders,
      collaboration: this.collaboration,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}
module.exports = Task;