# Environment Variables for Deployment

When deploying this application to Coolify or any other hosting service, you will need to set the following environment variables.

## Backend

These variables should be set for the backend Node.js application.

- `DATABASE_URL`: The connection string for your Supabase PostgreSQL database.
  - **Example:** `postgresql://postgres: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@db.ewysyrsfsuiaatmtrjko.supabase.co:5432/postgres`

- `JWT_SECRET`: A long, random, and secret string used to sign the JSON Web Tokens (JWTs) for user authentication. You have already provided one, but you can generate a new one for production if you wish.
  - **Example:** `boyIHQH/+/CprHoM9ckcEjvF0YKLQwwkrBtNhYN7XHTG9HxIIjj6k4dfsf+c+DRXT/8Facj3FEzJAecBkqP2VQ==`

- `PORT`: The port on which the backend server will run. This is typically provided by the hosting service, but you can set it to `3001` if you need to specify it.

## Frontend

The frontend is a static application built with Vite and React. The only configuration it needs is the URL of the backend API. This is currently hardcoded in `services/api.ts` to `http://localhost:3001/api`. For a production deployment, you will need to change this to the public URL of your deployed backend service.

For example, if your backend is deployed at `https://my-barestask-backend.coolify.app`, you would change the `API_URL` constant in `services/api.ts` to:

```typescript
const API_URL = 'https://my-barestask-backend.coolify.app/api';
```

## Frontend

These variables should be set for the frontend application during the build process in Coolify.

- `VITE_API_URL`: The full URL of your deployed backend API.
  - **Example:** If your backend is deployed at `https://my-backend.coolify.app`, you should set this variable to `https://my-backend.coolify.app/api`.
