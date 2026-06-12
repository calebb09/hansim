# HanSim Hair Academy API

Backend API for HanSim Hair Color Academy. The service manages users, courses, bilingual lessons, PDF lesson materials, subscriptions, payments, comments, certificates, settings, and admin workflows.

## Tech Stack

- Node.js 22+ with Express
- PostgreSQL with Prisma ORM
- Firebase Admin for authentication and role claims
- Stripe and Chapa payment integrations
- Multer for lesson PDF uploads
- node-cron for subscription expiration checks
- Zod for request validation

## Requirements

- Node.js `>=22.21.0`
- npm `>=10.0.0`
- PostgreSQL database
- Firebase project with a service account JSON file
- Stripe and/or Chapa credentials for payment flows

## Getting Started

Install dependencies:

```bash
npm install
```

Create a `.env` file in the project root:

Generate the Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Start the development server:

```bash
npm run dev
```

The API runs at:

```text
http://localhost:5000
```

Health check:

```text
GET /api/health
```

## Scripts

| Command                   | Description                             |
| ------------------------- | --------------------------------------- |
| `npm run dev`             | Start the API with nodemon              |
| `npm start`               | Start the API with Node                 |
| `npm run prisma:generate` | Generate Prisma client                  |
| `npm run prisma:migrate`  | Run Prisma migrations in development    |
| `npm run prisma:studio`   | Open Prisma Studio                      |
| `npm run prisma:db-push`  | Push schema changes without a migration |
| `npm run seed`            | Run the seed script, if present         |

## API Routes

All routes are mounted under `/api`.

### Health

| Method | Route     | Access |
| ------ | --------- | ------ |
| `GET`  | `/health` | Public |

### Auth

| Method | Route               | Access               |
| ------ | ------------------- | -------------------- |
| `POST` | `/auth/register`    | Public               |
| `POST` | `/auth/login`       | Public, rate limited |
| `POST` | `/auth/refresh`     | Public, rate limited |
| `GET`  | `/auth/revoke/:uid` | Admin                |

### Courses

| Method   | Route                        | Access                         |
| -------- | ---------------------------- | ------------------------------ |
| `GET`    | `/courses`                   | Public, optional Firebase auth |
| `GET`    | `/courses/:id`               | Public                         |
| `POST`   | `/courses`                   | Admin                          |
| `POST`   | `/courses/:id/create_lesson` | Admin, multipart PDF upload    |
| `DELETE` | `/courses/:id`               | Admin                          |

Lesson PDF upload fields:

- `pdfEn`
- `pdfAm`

Only PDF files are accepted.

### Lessons

| Method   | Route                       | Access                                 |
| -------- | --------------------------- | -------------------------------------- |
| `GET`    | `/lessons/course/:courseId` | Student/Admin with active subscription |
| `GET`    | `/lessons/:id`              | Student/Admin with active subscription |
| `GET`    | `/lessons/complete/:id`     | Student with active subscription       |
| `PUT`    | `/lessons/:id`              | Admin, multipart PDF upload            |
| `DELETE` | `/lessons/:id`              | Admin                                  |

### Comments

| Method   | Route                        | Access                                 |
| -------- | ---------------------------- | -------------------------------------- |
| `POST`   | `/comments`                  | Student/Admin with active subscription |
| `GET`    | `/comments/lesson/:lessonId` | Student/Admin with active subscription |
| `DELETE` | `/comments/:id`              | Student/Admin with active subscription |

### Users

| Method | Route              | Access        |
| ------ | ------------------ | ------------- |
| `GET`  | `/users/dashboard` | Student       |
| `GET`  | `/users/profile`   | Student/Admin |

### Certificates

| Method | Route                    | Access                           |
| ------ | ------------------------ | -------------------------------- |
| `POST` | `/certificates/generate` | Student with active subscription |
| `GET`  | `/certificates/my`       | Student with active subscription |

### Payments

| Method | Route                          | Access                           |
| ------ | ------------------------------ | -------------------------------- |
| `GET`  | `/payment/mySubscription`      | Student                          |
| `GET`  | `/payment/subscribe/:currency` | Student                          |
| `POST` | `/payment/chapa-webhook`       | Chapa webhook signature required |
| `POST` | `/payment/webhook`             | Stripe webhook raw body route    |

The Stripe webhook is mounted directly in `src/server.js` so it can receive the raw request body before JSON parsing.

### Admin

| Method  | Route                      | Access         |
| ------- | -------------------------- | -------------- |
| `GET`   | `/admin/students`          | Admin          |
| `PATCH` | `/admin/subscriptions/:id` | Admin workflow |

### Settings

| Method   | Route           | Access                   |
| -------- | --------------- | ------------------------ |
| `POST`   | `/settings`     | Admin                    |
| `GET`    | `/settings`     | Public                   |
| `PUT`    | `/settings/:id` | Admin                    |
| `DELETE` | `/settings/:id` | Public in current routes |

## Authentication

Protected routes expect a Firebase ID token:

```http
Authorization: Bearer <firebase-id-token>
```

Role checks use Firebase custom claims. Supported roles in the database schema are:

- `STUDENT`
- `ADMIN`
- `INSTRUCTOR`

## Database Models

The Prisma schema defines:

- `User`
- `Course`
- `Lesson`
- `Transaction`
- `Subscription`
- `Setting`
- `LessonCompletion`
- `Comment`
- `Certificate`
- `Coupon`
- `ActivityLog`

Primary enums:

- `Role`: `STUDENT`, `ADMIN`, `INSTRUCTOR`
- `Language`: `EN`, `AM`
- `SubscriptionStatus`: `PENDING`, `ACTIVE`, `EXPIRED`, `CANCELED`, `SUSPENDED`
- `TransactionStatus`: `PENDING`, `SUCCEEDED`, `FAILED`

## File Uploads

Lesson PDFs are stored under:

```text
uploads/pdfs
```

The app creates the upload directory at startup if it does not exist. Uploaded files are served from:

```text
/uploads
```

## Subscription Job

On startup, the API:

1. Connects to PostgreSQL.
2. Starts the subscription expiration cron job.
3. Runs an immediate subscription expiration check.

By default, the job runs daily at 9:00 AM in `Africa/Addis_Ababa`.

## Postman

A Postman collection is included at:

```text
postman/HanSim-Hair-API.postman_collection.json
```

Import it into Postman to test the API routes.

## Project Structure

```text
src/
  config/          App, database, Firebase, and CORS configuration
  controller/      Route handlers
  jobs/            Scheduled background jobs
  middleware/      Auth, validation, upload, error, and rate-limit middleware
  routes/          Express route modules
  services/        Firebase, payment, mail, and subscription services
  validations/     Zod schemas
prisma/
  schema.prisma    Database schema
  migrations/      Prisma migrations
firebase/          Firebase service account JSON files
uploads/           Runtime PDF uploads served from /uploads
postman/           API collection
```

## License

See [LICENSE](LICENSE).
