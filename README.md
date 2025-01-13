# Waddle Application

This application provides an API endpoiint for managing guardian, vendors, activities and payment for the waddle mobile app.

## Features

- **Admin Management:**
  - Create a new admin account using seeded data from the environmental variable
  - Signin to the account as an admin using email and password
- **Guardian Management:**
  - Create new account as a guardian using email and password
  - Signin to the account using email and password
  - Create new account as a guardian using single signin operation
  - View and update profile details.
- **Vendor Management:**
  - Create new account as a vendor using business name, business registration number, email and password
  - Signin to the account using email and password
  - View and update profile details.
- **Activity Management:**
  - Create and update activity as a vendor.
  - View all activity as a guardian.

## Technologies Used

- **Backend:** NestJS, TypeScript, Node.js
- **ER Diagram:** https://dbdiagram.io/d/Waddle-ERD-67497181e9daa85aca1bacbc
- **Database:** PostgreSQL (using Prisma ORM)
- **Testing:** Jest, Supertest
- **API Documentation:** Swagger

## Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/AkanWealth/waddle-api.git
   ```

2. **Install dependencies:**

   ```bash
   cd waddle-api
   npm install
   ```

3. **Set up environment variables:**

   - Create a `.env` file in the project root.
   - Add the following environment variables:
     ```
     DATABASE_URL=<your_postgresql_connection_string>
     ```

4. **Generate Prisma Client:**

   ```bash
   npx prisma generate
   ```

5. **Run migrations (if applicable):**

   ```bash
   npx prisma migrate dev
   ```

6. **Add the following to your env file with appropriate values for admin data:**

   ```
   SEED_USER_NAME=<your_admin_name>
   SEED_USER_EMAIL=<your_admin_email>
   SEED_PASSWORD=<your_admin_password>
   ```

7. **Seed the data to the database:**

   ```bash
   npx prisma db seed
   ```

8. **Start the application:**
   ```bash
   npm run start:dev
   ```

## Testing

1. **Run tests:**
   ```bash
   npm run test:e2e-watch
   ```

## API Documentation

- Refer to the Swagger documentation for detailed API endpoints, request/response payloads, and usage instructions.

## Contributing

1. Fork the repository.
2. Create a new branch for your feature/bug fix.
3. Make your changes and commit them with clear messages.
4. Push your branch to your fork.
5. Create a pull request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
