import express from 'express';
import cors from 'cors';

const host = process.env.HOST ?? 'localhost';

const app = express();

app.use(cors({
  origin: ["http://localhost:3000"],
  allowedHeaders: ["Authorization", "Content-Type"],
  credentials: true,
}),
);

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
