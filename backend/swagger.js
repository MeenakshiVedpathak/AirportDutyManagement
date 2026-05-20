const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Airport Protocol API',
      version: '1.0.0',
      description: 'REST API for Airport Protocol System — GTT DATA',
    },
    servers: [{ url: 'http://localhost:5000/api/v1' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        LoginRequest: {
          type: 'object',
          required: ['identifier', 'password'],
          properties: {
            identifier: { type: 'string', example: 'admin', description: 'Username, email or phone number' },
            password: { type: 'string', example: 'admin123' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            role: { type: 'string', enum: ['ADMIN', 'OFFICER'] },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            employeeId: { type: 'string' },
            role: { type: 'string', enum: ['ADMIN', 'OFFICER'] },
            isEnabled: { type: 'boolean' },
          },
        },
        Duty: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            officerId: { type: 'string' },
            officerName: { type: 'string' },
            date: { type: 'string', example: '2024-07-15' },
            reportingTime: { type: 'string', example: '08:30 AM' },
            officeType: { type: 'string', enum: ['REGULAR', 'BEFORE_OFFICE', 'AFTER_OFFICE', 'HOLIDAY'] },
            from: { type: 'string', example: 'Mumbai' },
            to: { type: 'string', example: 'Delhi' },
            flightNo: { type: 'string', example: '6E 201' },
            flightTime: { type: 'string', example: '10:00 AM' },
            airport: { type: 'string', enum: ['T-1', 'T-2', 'ULVE'] },
            arrivalDeparture: { type: 'string', enum: ['ARRIVAL', 'DEPARTURE'] },
            status: { type: 'string', enum: ['UPCOMING', 'COMPLETED', 'CANCELLED'] },
            incentive: {
              type: 'object',
              properties: { eligible: { type: 'boolean' }, amount: { type: 'number' } },
            },
          },
        },
        CreateDutyRequest: {
          type: 'object',
          required: ['officerId', 'officerName', 'date', 'reportingTime', 'officeType', 'from', 'to', 'flightNo', 'flightTime', 'airport', 'arrivalDeparture'],
          properties: {
            officerId: { type: 'string' },
            officerName: { type: 'string' },
            date: { type: 'string', example: '2024-07-15' },
            reportingTime: { type: 'string', example: '08:30 AM' },
            officeType: { type: 'string', enum: ['REGULAR', 'BEFORE_OFFICE', 'AFTER_OFFICE', 'HOLIDAY'] },
            from: { type: 'string' },
            to: { type: 'string' },
            flightNo: { type: 'string' },
            flightTime: { type: 'string' },
            airport: { type: 'string', enum: ['T-1', 'T-2', 'ULVE'] },
            arrivalDeparture: { type: 'string', enum: ['ARRIVAL', 'DEPARTURE'] },
          },
        },
        AddSubordinateRequest: {
          type: 'object',
          required: ['name', 'email', 'phone', 'employeeId'],
          properties: {
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', example: 'john@airport.com' },
            phone: { type: 'string', example: '9876543210' },
            employeeId: { type: 'string', example: 'EMP002' },
          },
        },
        Error: {
          type: 'object',
          properties: { message: { type: 'string' } },
        },
      },
    },
    paths: {
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login with username, email or phone',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
          responses: {
            200: { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
            401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Logged out' } },
        },
      },
      '/duties': {
        get: {
          tags: ['Duties'],
          summary: 'Get all duties (admin sees all, subordinate sees own)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['UPCOMING', 'COMPLETED', 'CANCELLED'] } },
            { in: 'query', name: 'officerId', schema: { type: 'string' } },
            { in: 'query', name: 'airport', schema: { type: 'string' } },
            { in: 'query', name: 'dateFrom', schema: { type: 'string', example: '2024-07-01' } },
            { in: 'query', name: 'dateTo', schema: { type: 'string', example: '2024-07-31' } },
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: {
              description: 'List of duties',
              content: { 'application/json': { schema: { type: 'object', properties: { duties: { type: 'array', items: { $ref: '#/components/schemas/Duty' } }, total: { type: 'integer' }, hasMore: { type: 'boolean' } } } } },
            },
          },
        },
        post: {
          tags: ['Duties'],
          summary: 'Create a duty',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateDutyRequest' } } } },
          responses: { 201: { description: 'Duty created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Duty' } } } } },
        },
      },
      '/duties/{id}': {
        get: {
          tags: ['Duties'],
          summary: 'Get duty by ID',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Duty detail', content: { 'application/json': { schema: { $ref: '#/components/schemas/Duty' } } } } },
        },
        delete: {
          tags: ['Duties'],
          summary: 'Delete a duty (Admin only)',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Duty deleted' } },
        },
      },
      '/duties/{id}/status': {
        patch: {
          tags: ['Duties'],
          summary: 'Update duty status',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['UPCOMING', 'COMPLETED', 'CANCELLED'] } } } } } },
          responses: { 200: { description: 'Updated duty', content: { 'application/json': { schema: { $ref: '#/components/schemas/Duty' } } } } },
        },
      },
      '/officers': {
        get: {
          tags: ['Subordinates'],
          summary: 'Get all subordinates (Admin only)',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'List of subordinates', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } } },
        },
        post: {
          tags: ['Subordinates'],
          summary: 'Add a subordinate (Admin only) — default password is last 4 digits of phone',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AddSubordinateRequest' } } } },
          responses: { 201: { description: 'Subordinate created', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } },
        },
      },
      '/officers/{id}': {
        put: {
          tags: ['Subordinates'],
          summary: 'Update subordinate (Admin only)',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AddSubordinateRequest' } } } },
          responses: { 200: { description: 'Updated subordinate' } },
        },
      },
      '/officers/{id}/access': {
        patch: {
          tags: ['Subordinates'],
          summary: 'Enable / Disable subordinate login (Admin only)',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { isEnabled: { type: 'boolean' } } } } } },
          responses: { 200: { description: 'Access updated' } },
        },
      },
      '/reports/duties': {
        get: {
          tags: ['Reports'],
          summary: 'Duty report with summary and incentive totals',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'officerId', schema: { type: 'string' } },
            { in: 'query', name: 'airport', schema: { type: 'string' } },
            { in: 'query', name: 'status', schema: { type: 'string' } },
            { in: 'query', name: 'dateFrom', schema: { type: 'string' } },
            { in: 'query', name: 'dateTo', schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Duty report' } },
        },
      },
      '/reports/subordinates': {
        get: {
          tags: ['Reports'],
          summary: 'Per-subordinate summary report (Admin only)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'dateFrom', schema: { type: 'string' } },
            { in: 'query', name: 'dateTo', schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Subordinate report' } },
        },
      },
    },
  },
  apis: [],
};

module.exports = swaggerJsdoc(options);
