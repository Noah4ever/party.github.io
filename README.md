# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

### Admin tools & authentication

- The admin area is protected behind a password prompt. The default password is `ashlii`.
- To change it, set `ADMIN_PASSWORD=<your-secret>` in the root `.env` file (or in `server/.env`).
- A successful login stores a temporary Bearer token in secure storage and sends it on every mutating request.
- Tokens expire automatically after 12 hours or when you log out from the **Control** tab.

### Running the API server

```bash
cd server
npm install
npm run dev:local   # serves the API on http://localhost:5050
```

Environment variables loaded from `.env`:

- `ADMIN_PASSWORD` — required password for `/api/auth/login` (defaults to `ashlii`).
- `PORT` — override the local server port (defaults to 5000; the `dev:local` script uses 5050).
- `ALLOWED_ORIGINS` — optional comma-separated list appended to the default CORS whitelist.
- Websocket clients connect to `ws(s)://<api-host>/api/ws` for real-time game state updates. The Expo app uses this
  channel to learn when the party has started without polling.
- Client-side `.env` keys:
  - `EXPO_PUBLIC_DEV` / `DEV` — set to `true` for local development, `false` for production builds.
  - `EXPO_PUBLIC_API_BASE` — override the API URL used by the Expo app (e.g. `http://localhost:5050/api`).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
