# Firebase Setup Instructions

To enable shared data across all users visiting your meal planner website, you need to set up Firebase Firestore.

## Steps to Set Up Firebase:

### 1. Create a Firebase Project
1. Go to https://console.firebase.google.com/
2. Click "Create a project"
3. Enter a project name (e.g., "my-meal-planner")
4. Follow the setup wizard (you can disable Google Analytics if not needed)

### 2. Enable Firestore Database
1. In your Firebase project console, click "Firestore Database"
2. Click "Create database"
3. Choose "Start in production mode" 
4. Select a location close to your users

### 3. Configure Security Rules
1. In Firestore, go to the "Rules" tab
2. Replace the rules with:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /mealPlanner/{document} {
      allow read, write: if true;
    }
  }
}
```
3. Click "Publish"

**Note:** These rules allow anyone to read/write data. For production use, consider implementing authentication.

### 4. Get Your Firebase Configuration
1. In the Firebase console, click the gear icon → "Project settings"
2. Scroll down to "Your apps" and click "Add app" → Web (</>) 
3. Register your app with a nickname
4. Copy the configuration object that looks like:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com", 
  messagingSenderId: "123456789",
  appId: "1:123:web:abc123"
};
```

### 5. Update Your Code
1. Open `script.js`
2. Find the `firebaseConfig` object at the top (around line 2)
3. Replace the placeholder values with your actual Firebase config values
4. Save the file

### 6. Deploy and Test
1. Push your changes to GitHub
2. Visit your GitHub Pages URL
3. Add some meals and check if they appear for other users

## Troubleshooting

- **Data not syncing?** Check the browser console for Firebase errors
- **"Permission denied" errors?** Verify your Firestore security rules
- **App still using localStorage?** Make sure you replaced the placeholder Firebase config values

## Fallback Behavior

If Firebase is not configured or fails to connect, the app will automatically fall back to localStorage (local-only storage).