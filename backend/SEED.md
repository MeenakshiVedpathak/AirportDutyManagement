# Database Seed

Seeds the initial Admin user into MongoDB. Safe to run multiple times — skips if an admin already exists.

## Prerequisites

- Node.js installed
- `backend/.env` file present with `MONGODB_URI` set

## How to Run

```bash
cd backend
npm run seed
```

## What It Creates

| Field       | Value              |
|-------------|--------------------|
| Name        | Admin User         |
| Username    | `admin`            |
| Password    | `admin123`         |
| Email       | admin@airport.com  |
| Phone       | 9000000000         |
| Employee ID | EMP001             |
| Role        | ADMIN              |

> **Change the password** after first login.

## Notes

- If an admin user already exists in the database, the script exits without making any changes.
- The `MONGODB_URI` in `.env` must point to the correct database (local or Railway/Atlas) before running.
- To target the production database, ensure `.env` has the production `MONGODB_URI`.
