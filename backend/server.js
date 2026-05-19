require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

connectDB();

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Swagger docs at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Airport Duty API Docs',
  swaggerOptions: { persistAuthorization: true },
}));

app.use('/api/v1/auth', require('./routes/auth'));

app.use('/api/v1/duties', require('./routes/duties'));

app.use('/api/v1/officers', require('./routes/officers'));

app.use('/api/v1/airports', require('./routes/airports'));

app.use('/api/v1/reports', require('./routes/reports'));

app.use('/api/v1/boarding-pass', require('./routes/boardingPass'));

app.get('/', (req, res) => {
  res.send('Airport Duty API Running');
});

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use(errorHandler);

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
