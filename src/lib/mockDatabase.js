/**
 * Mock Database - Replaces Base44 entity storage
 * Uses localStorage for persistence across page reloads
 */

const DB_PREFIX = 'mock_db_';

class MockDatabase {
  constructor() {
    this.data = {};
    this.loadFromStorage();
  }

  loadFromStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(DB_PREFIX)) {
          const tableName = key.replace(DB_PREFIX, '');
          this.data[tableName] = JSON.parse(localStorage.getItem(key)) || [];
        }
      }
    } catch (err) {
      console.warn('Failed to load from localStorage:', err);
    }
  }

  saveToStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      Object.entries(this.data).forEach(([tableName, records]) => {
        localStorage.setItem(DB_PREFIX + tableName, JSON.stringify(records));
      });
    } catch (err) {
      console.warn('Failed to save to localStorage:', err);
    }
  }

  createTable(tableName, initialData = []) {
    if (!this.data[tableName]) {
      this.data[tableName] = initialData;
      this.saveToStorage();
    }
  }

  insert(tableName, record) {
    if (!this.data[tableName]) {
      this.data[tableName] = [];
    }
    const id = Math.random().toString(36).substr(2, 9);
    const newRecord = {
      ...record,
      id,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    };
    this.data[tableName].push(newRecord);
    this.saveToStorage();
    return newRecord;
  }

  find(tableName, filter = {}) {
    if (!this.data[tableName]) return [];
    return this.data[tableName].filter(record => {
      return Object.entries(filter).every(([key, value]) => {
        if (value === undefined || value === null) return true;
        return record[key] === value;
      });
    });
  }

  findOne(tableName, filter = {}) {
    const results = this.find(tableName, filter);
    return results[0] || null;
  }

  update(tableName, id, data) {
    if (!this.data[tableName]) return null;
    const index = this.data[tableName].findIndex(r => r.id === id);
    if (index === -1) return null;
    
    this.data[tableName][index] = {
      ...this.data[tableName][index],
      ...data,
      updated_date: new Date().toISOString(),
    };
    this.saveToStorage();
    return this.data[tableName][index];
  }

  delete(tableName, id) {
    if (!this.data[tableName]) return false;
    const index = this.data[tableName].findIndex(r => r.id === id);
    if (index === -1) return false;
    
    this.data[tableName].splice(index, 1);
    this.saveToStorage();
    return true;
  }

  list(tableName) {
    return this.data[tableName] || [];
  }

  clear() {
    this.data = {};
    if (typeof window !== 'undefined') {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(DB_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  }
}

export const mockDb = new MockDatabase();
