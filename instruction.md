# Server Project Instructions

## Project Structure

The project is a Node.js application using the Express framework. The `src` directory is organized as follows:

- **config/**: Contains configuration files for the application, such as database connections and environment variables.
- **controllers/**: Holds the business logic for handling incoming requests. Each controller corresponds to a specific route.
- **docs/**: Contains API documentation.
- **jobs/**: For background or scheduled tasks.
- **libs/**: Includes reusable libraries or modules.
- **middleware/**: Contains Express middleware for processing requests, such as authentication, logging, and error handling.
- **models/**: Defines data models or schemas, typically for interacting with a database.
- **routes/**: Defines the API routes and maps them to the appropriate controllers.
- **tests/**: Contains test files for the application.
- **utils/**: Holds utility functions used across the application.
- **validators/**: Contains schemas and functions for validating incoming data.

## Usage

### Prerequisites

- Node.js and npm installed.

### Installation

1. Navigate to the project directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the application

To start the server in development mode with auto-reloading, run:

```bash
npm run dev
```

To start the server in production mode, run:

```bash
npm start
```

The server will typically run on a port defined in your environment variables or configuration (e.g., `3000` or `8080`).

## Data Flow

1. **Incoming Request**: The server receives an HTTP request to a specific endpoint.
2. **Middleware**: The request passes through any configured middleware for tasks like logging, authentication, or rate limiting.
3. **Routing**: The Express router matches the request path to a defined route and forwards the request to the corresponding controller.
4. **Controller Logic**: The controller processes the request, interacts with models to perform database operations, and calls any necessary utility or library functions.
5. **Validation**: If applicable, a validator is used to check the integrity of the incoming data.
6. **Response**: The controller sends a response back to the client, usually in JSON format, with a status code indicating the outcome of the request.

### Data Flow Diagram

```plaintext
[Client Request] -> [Middleware] -> [Router] -> [Validator] -> [Controller] -> [Model] -> [Database]
      ^                                                                                    |
      |                                                                                    v
[Client Response] <-------------------------------------------------------------------- [Data]
```



init db -
 b1: mở terminal  : ``` mongosh ./script/init-db.js```
b2: mở mongoCompass: check name: EventTicketDB