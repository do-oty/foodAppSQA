# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Project Overview

This is a premium React Native food delivery application built with Expo. It features a rich, aesthetic UI with dynamic carousels, infinite scrolling marquees for reviews, and custom animated modals. It integrates with a Supabase-backed API for user authentication, cart management, and order placement.

## Features & Notable Capabilities

- **Infinite Scrolling Marquee**: A custom review ticker on the restaurant screen that loops infinitely.
- **Dynamic Randomization**: Feeds and restaurants are randomized on load to keep the app feeling fresh, while maintaining working category filters.
- **Resilient Offline Cache**: Automatically falls back to locally cached data if the sleeping Vercel API returns empty arrays.
- **Custom Bottom Sheets**: Handcrafted animated bottom sheets with fading shadows for a native feel.

## Current Limitations & Known Constraints

Due to backend constraints and the current project scope, the following features are not fully functional or are simulated:

1. **Real-time Notifications**: There is no live backend notification server. Notifications are simulated locally after specific actions (like placing an order).
2. **Real-time Order Tracking**: Live GPS tracking is not supported by the backend. The order tracker modal is a UI simulation.
3. **Review Creation via App**: The API strictly requires a verified delivery to allow creating reviews (returning 403 otherwise). Mass reviews were populated directly via SQL for testing.
4. **Favorites Persistence**: The `/favorites` API endpoint is currently unavailable. Favorites work optimistically in the current session but do not persist across app restarts.

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

## API Optimization & Resilience (Vercel Free Tier Workarounds)

Due to the backend being hosted on a free Vercel instance, several optimizations were implemented to ensure a smooth user experience despite slow response times and cold starts:

1. **Auto-Retry on Empty Lists**: If the API returns a success status but an empty array for lists (like `/restaurants`), the app automatically retries up to 3 times with linear backoff (1s, 2s, 3s) before giving up, as this usually indicates the database is still waking up.
2. **AsyncStorage Caching Fallback**: Successful fetches for restaurants and menu items are cached locally. If the API fails to return data on subsequent loads, the app will automatically fall back to the cached data so users never see a blank screen.
3. **Frontend-Only Filtering**: To prevent massive delays when tapping category tags, data filtering is performed in-memory on the frontend rather than making a new API request every time.
