import express from 'express';
import cors from 'cors';
import { errorMiddleware } from '@packages/error_handler/error_middleware';
import cookieParser from 'cookie-parser';
import router from './routes/auth.router';
import swaggerUi from 'swagger-ui-express';
const swaggerDocument = require('./swagger-output.json');

const host = process.env.HOST ?? 'localhost';

const app = express();

app.use(cors({
  origin: ["http://localhost:3000"],
  allowedHeaders: ["Authorization", "Content-Type"],
  credentials: true,
}),
);



app.use(errorMiddleware);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Routes

app.use("/api", router);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/docs-json', (req, res) => {
  res.json(swaggerDocument);
})

app.get('/', (req, res) => {
  res.send({ message: 'Hello from Auth-Service' });
});

const port = process.env.PORT || 6001;
const server = app.listen(port, () => {
  console.log(`Auth service is running on http://${host}:${port}/api`);
  console.log(`Swagger docs are available at http://${host}:${port}/docs-json`);
})

server.on('error', (err) => {
  console.error('Server error:', err);
});
