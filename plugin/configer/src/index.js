const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express')
const apiRoute = require('./routes/api')

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
app.use(express.static(path.join(__dirname, 'public')))
app.use('/api', apiRoute)

let server
server = app.listen(process.env.PORT_HTTP, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT_HTTP}`)
});

function shutDown(cause) {
    console.log(`Received ${cause}. Shutting down...`);
  
    // Stop accepting new connections
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0); // Exit the process
    });
  
    // Forcefully exit if the shutdown takes too long (e.g., after 10 seconds)``
    setTimeout(() => {
      console.error('Forcing shutdown due to timeout');
      process.exit(1); // Exit with failure code
    }, 10000); // 10-second timeout
  }
  
  process.on('SIGINT', () => shutDown('SIGINT'));
  process.on('SIGTERM', () => shutDown('SIGTERM'));
  
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    shutDown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutDown('unhandledRejection');
  });
  
  process.on('beforeExit', (code) => {
    console.log(`Process will exit soon with code: ${code}`);
  });
  
  process.on('exit', (code) => {
    console.log(`Process exited with code: ${code}`);
  });