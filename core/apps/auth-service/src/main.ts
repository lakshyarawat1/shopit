import express from 'express';
import cors from 'cors';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { errorMiddleware } from '../../../packages/error_handler/error_middleware';
import cookieParser from 'cookie-parser';

const host = process.env.HOST ?? 'localhost';

const app = express();

app.use(cors({
  origin: ["http://localhost:3000"],
  allowedHeaders: ["Authorization", "Content-Type"],
  credentials: true,
}),
);

app.use(errorMiddleware);
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
  res.send({ message: 'Hello from Auth-Service' });
});

const port = process.env.PORT || 6001;
const server = app.listen(port, () => {
  console.log(`Auth service is running on http://${host}:${port}/api`);
})

server.on('error', (err) => {
  console.error('Server error:', err);
});
