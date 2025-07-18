import Database from '../config/database.js';
import Task  from '../models/Task.js';

class TaskRepository {
  constructor() {
    this.collectionName = 'tasks';
  }

  async findByUserId(userId) {
    try {
      const db = await Database.getInstance().initialize();
      const tasksRef = db.collection('users').doc(userId).collection(this.collectionName);
      const snapshot = await tasksRef.get();

      if (snapshot.empty) {
        return [];
      }

      const tasks = [];
      snapshot.forEach(doc => {
        tasks.push(new Task({ id: doc.id, ...doc.data() }));
      });

      return tasks;
    } catch (error) {
      console.error('Error fetching tasks by user ID:', error);
      throw error;
    }
  }

  async findById(userId, taskId) {
    try {
      const db = await Database.getInstance().initialize();
      const taskRef = db.collection('users').doc(userId).collection(this.collectionName).doc(taskId);
      const doc = await taskRef.get();

      if (!doc.exists) {
        return null;
      }

      return new Task({ id: doc.id, ...doc.data() });
    } catch (error) {
      console.error('Error fetching task by ID:', error);
      throw error;
    }
  }

  async create(taskData) {
    try {
      const db = await Database.getInstance().initialize();
      const task = new Task(taskData);

      const validationErrors = task.validate();
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      const tasksRef = db.collection('users').doc(task.userId).collection(this.collectionName);
      const docRef = await tasksRef.add(task.toJSON());

      task.id = docRef.id;
      return task;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async update(userId, taskId, updateData) {
    try {
      const db = await Database.getInstance().initialize();
      const taskRef = db.collection('users').doc(userId).collection(this.collectionName).doc(taskId);

      const updatedData = {
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      await taskRef.update(updatedData);

      const updatedDoc = await taskRef.get();
      return new Task({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async delete(userId, taskId) {
    try {
      const db = await Database.getInstance().initialize();
      const taskRef = db.collection('users').doc(userId).collection(this.collectionName).doc(taskId);
      await taskRef.delete();
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }
}

export default TaskRepository;
