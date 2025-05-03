# Waddle Application

This application provides a multi-role system with distinct functionalities for administrators, guardians, and vendors:

- Admin Management: Administrators can manage the entire system, including user roles (sub-admins, orgornisers, guardians), and events. They can also create admin and sub-admin accounts, and sign in/out.

- Guardian Management: Guardians can create accounts (via email/password or SSO), sign in, and manage their profiles.

- Orgorniser Management: Orgornisers can create accounts, sign in, manage their profiles, create and manage events, and invite staff.

- Event Management: Orgornisers, orgorniser staffs, and admins can create and update events, with guardians able to view published events. Event creation includes the ability to save drafts.

## Technologies Used

- **Backend:** NestJS, TypeScript, Node.js
- **ER Diagram:** https://dbdiagram.io/d/Waddle-ERD-67497181e9daa85aca1bacbc
- **Database:** PostgreSQL (using Prisma ORM)
- **Testing:** Jest, Supertest
- **API Documentation:** Swagger
- **Payment gateway:** Stripe, and Stripe webhook
- **Firebace Notification:** Push notification system

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
   npx prisma migrate dev --name init
   ```

6. **Add the following to your env file with appropriate values for admin data:**

   ```
   SEED_FIRST_NAME=<super_admin_first_name>
   SEED_LAST_NAME=<super_admin_last_name>
   SEED_EMAIL=<super_ admin_email>
   SEED_PASSWORD=<super_admin_password>
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

- Refer to the Swagger or Redoc documentation for detailed API endpoints, request/response payloads, and usage instructions.

## Contributing

1. Fork the repository.
2. Create a new branch for your feature/bug fix.
3. Make your changes and commit them with clear messages.
4. Push your branch to your forked repo.
5. Create a pull request to the main branch of the forked repo.
6. Create a pull request accross repo to the owners branch.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Resources

- CodeMood: https://thecodemood.com/?s=nestjs
