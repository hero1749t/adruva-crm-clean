// ============================================================
// 🛠️ TEST UTILITIES & HELPERS
// ============================================================

/**
 * Generate random test data
 */
export const TestDataGenerator = {
  generateLead: (overrides = {}) => ({
    id: `lead-${Math.random().toString(36).substr(2, 9)}`,
    name: `Test Company ${Math.random().toString(36).substr(2, 5)}`,
    email: `lead${Date.now()}@test.com`,
    phone: `+1-555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
    status: 'new_lead',
    created_at: new Date().toISOString(),
    ...overrides
  }),

  generateClient: (overrides = {}) => ({
    id: `client-${Math.random().toString(36).substr(2, 9)}`,
    name: `Client Corp ${Math.random().toString(36).substr(2, 5)}`,
    email: `client${Date.now()}@test.com`,
    status: 'active',
    contract_value: Math.floor(Math.random() * 500000) + 50000,
    created_at: new Date().toISOString(),
    ...overrides
  }),

  generateTask: (overrides = {}) => ({
    id: `task-${Math.random().toString(36).substr(2, 9)}`,
    title: `Task ${Math.random().toString(36).substr(2, 5)}`,
    description: 'Test task description',
    status: 'pending',
    priority: ['urgent', 'high', 'medium', 'low'][Math.floor(Math.random() * 4)],
    due_date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    ...overrides
  }),

  generateInvoice: (overrides = {}) => ({
    id: `inv-${Math.random().toString(36).substr(2, 9)}`,
    invoice_number: `INV-${Date.now()}`,
    items: [
      { description: 'Service 1', qty: 1, rate: 5000, amount: 5000 },
      { description: 'Service 2', qty: 2, rate: 2500, amount: 5000 }
    ],
    subtotal: 10000,
    tax: 1000,
    total: 11000,
    status: 'issued',
    payment_status: 'unpaid',
    created_at: new Date().toISOString(),
    ...overrides
  }),

  generateUser: (overrides = {}) => ({
    id: `user-${Math.random().toString(36).substr(2, 9)}`,
    email: `user${Date.now()}@test.com`,
    name: `Test User ${Math.random().toString(36).substr(2, 5)}`,
    role: 'team',
    status: 'active',
    created_at: new Date().toISOString(),
    ...overrides
  })
};

/**
 * Validation utilities
 */
export const Validators = {
  isValidEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  
  isValidPhone: (phone) => /^\+?[\d\s\-\(\)]{10,}$/.test(phone),
  
  isValidAmount: (amount) => {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0;
  },
  
  isValidStatus: (status, validStatuses) => validStatuses.includes(status),
  
  hasRequiredFields: (obj, fields) => 
    fields.every(field => obj[field] !== undefined && obj[field] !== null && obj[field] !== ''),

  isValidDateRange: (startDate, endDate) => new Date(startDate) < new Date(endDate),

  isValidPercentage: (value) => value >= 0 && value <= 100
};

/**
 * Mock Database operations
 */
export const MockDatabase = {
  leads: [],
  clients: [],
  tasks: [],
  invoices: [],
  users: [],

  createLead(lead) {
    this.leads.push(lead);
    return lead;
  },

  createClient(client) {
    this.clients.push(client);
    return client;
  },

  createTask(task) {
    this.tasks.push(task);
    return task;
  },

  createInvoice(invoice) {
    this.invoices.push(invoice);
    return invoice;
  },

  createUser(user) {
    this.users.push(user);
    return user;
  },

  findLead(id) {
    return this.leads.find(l => l.id === id);
  },

  findClient(id) {
    return this.clients.find(c => c.id === id);
  },

  findTask(id) {
    return this.tasks.find(t => t.id === id);
  },

  updateLead(id, updates) {
    const lead = this.findLead(id);
    if (lead) Object.assign(lead, updates, { updated_at: new Date().toISOString() });
    return lead;
  },

  updateClient(id, updates) {
    const client = this.findClient(id);
    if (client) Object.assign(client, updates, { updated_at: new Date().toISOString() });
    return client;
  },

  deleteLead(id) {
    this.leads = this.leads.filter(l => l.id !== id);
  },

  deleteClient(id) {
    this.clients = this.clients.filter(c => c.id !== id);
  },

  clear() {
    this.leads = [];
    this.clients = [];
    this.tasks = [];
    this.invoices = [];
    this.users = [];
  },

  getStats() {
    return {
      totalLeads: this.leads.length,
      totalClients: this.clients.length,
      totalTasks: this.tasks.length,
      totalInvoices: this.invoices.length,
      totalUsers: this.users.length
    };
  }
};

/**
 * Test helpers
 */
export const TestHelpers = {
  /**
   * Wait for async operation
   */
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate test report
   */
  generateReport: (results) => ({
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    passRate: `${((results.filter(r => r.passed).length / results.length) * 100).toFixed(2)}%`,
    duration: 'N/A'
  }),

  /**
   * Simulate API delay
   */
  simulateDelay: (min = 100, max = 500) => 
    new Promise(resolve => 
      setTimeout(resolve, Math.random() * (max - min) + min)
    ),

  /**
   * Random data
   */
  randomId: () => Math.random().toString(36).substr(2, 9),
  randomEmail: () => `${TestHelpers.randomId()}@test.com`,
  randomName: () => `Test ${TestHelpers.randomId()}`,

  /**
   * Compare objects
   */
  compareObjects: (obj1, obj2) => JSON.stringify(obj1) === JSON.stringify(obj2),

  /**
   * Deep clone
   */
  clone: (obj) => JSON.parse(JSON.stringify(obj)),

  /**
   * Measure execution time
   */
  measureTime: async (fn) => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return { result, time: end - start };
  }
};

/**
 * Mock API responses
 */
export const MockAPI = {
  /**
   * Simulate successful response
   */
  success: (data, delay = 100) => 
    new Promise(resolve => 
      setTimeout(() => resolve({ success: true, data }), delay)
    ),

  /**
   * Simulate error response
   */
  error: (message, code = 'ERROR', delay = 100) => 
    new Promise((_, reject) => 
      setTimeout(() => reject({ success: false, message, code }), delay)
    ),

  /**
   * Simulate paginated response
   */
  paginated: (data, page = 1, pageSize = 10) => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      data: data.slice(start, end),
      page,
      pageSize,
      total: data.length,
      pages: Math.ceil(data.length / pageSize)
    };
  },

  /**
   * Simulate rate limiting
   */
  rateLimit: (maxRequests = 10, windowMs = 1000) => {
    let requests = [];
    return async (fn) => {
      const now = Date.now();
      requests = requests.filter(time => now - time < windowMs);
      if (requests.length >= maxRequests) {
        throw new Error('Rate limit exceeded');
      }
      requests.push(now);
      return fn();
    };
  }
};

/**
 * Test assertions
 */
export const Assertions = {
  shouldBeValidLead: (lead) => {
    if (!lead.name) throw new Error('Lead must have name');
    if (!lead.email) throw new Error('Lead must have email');
    if (!Validators.isValidEmail(lead.email)) throw new Error('Invalid email format');
    if (!lead.status) throw new Error('Lead must have status');
  },

  shouldBeValidInvoice: (invoice) => {
    if (!invoice.invoice_number) throw new Error('Invoice must have number');
    if (!invoice.items || invoice.items.length === 0) throw new Error('Invoice must have items');
    if (invoice.total <= 0) throw new Error('Invoice total must be greater than 0');
  },

  shouldBeValidTask: (task) => {
    if (!task.title) throw new Error('Task must have title');
    if (!task.status) throw new Error('Task must have status');
    if (!task.priority) throw new Error('Task must have priority');
  }
};

// ============================================================
// ✅ TEST UTILITIES READY
// ============================================================
