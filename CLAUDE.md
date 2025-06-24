# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Application Overview

This is a client-side Weekly Meal Planner web application built with vanilla HTML, CSS, and JavaScript. The app allows users to plan breakfast, lunch, and dinner for up to 5 people across a week, manage meal options and ingredients, generate grocery lists, and archive meal plans.

## Architecture

### Core Components
- **index.html**: Single-page application with tab-based navigation (Weekly Plan, Meal Options, Ingredients, Grocery List, Archive)
- **script.js**: Single MealPlanner class (~1000 lines) handling all application logic
- **style.css**: Complete styling with responsive design and gradient themes

### Data Structure
The application supports both local (localStorage) and shared (Firebase Firestore) storage with these key data objects:
- `weeklyPlan`: Nested structure `{day: {person: {mealType: mealName}}}`
- `meals`: Array of meal objects with `{id, name, ingredients[]}`
- `ingredients`: Object mapping ingredient names to quantities `{ingredientName: quantity}`
- `personNames`: Object mapping person IDs to display names
- `archive`: Array of saved weekly plans

### Storage System
The app has dual storage capability:
- **Firebase Firestore**: Shared storage when configured (allows multiple users to see the same data)
- **localStorage**: Fallback storage for local-only usage
- **Automatic Fallback**: If Firebase fails or isn't configured, the app gracefully falls back to localStorage

### Key Architecture Patterns

**Data Flow**: The app has automatic saving on input changes but also explicit save functionality. All data persists to localStorage immediately when modified.

**Table Structure**: The weekly plan uses a table where each day column contains three vertically stacked input fields (breakfast, lunch, dinner). Each input has `data-day`, `data-person`, and `data-meal` attributes for identification.

**Backward Compatibility**: The `loadWeeklyPlan()` method handles both old format (single meal per person/day) and new format (breakfast/lunch/dinner per person/day) through type checking.

**Grocery List Generation**: Automatically calculates needed ingredients by cross-referencing planned meals with the meal database and comparing against available ingredients.

## Development Commands

This is a static web application - open `index.html` in a browser to run. For development with live reload:

```bash
# Start local server (Python 3)
python3 -m http.server 8000

# Start local server (Node.js - if available)
npx serve .
```

## Firebase Setup (Optional)

To enable shared storage across all users:

1. **Create Firebase Project**: Go to https://console.firebase.google.com/ and create a new project
2. **Enable Firestore**: Set up Firestore database in production mode
3. **Configure Security Rules**: Allow read/write access to the `mealPlanner` collection
4. **Get Config**: Copy the Firebase configuration object from project settings
5. **Update Code**: Replace the placeholder `firebaseConfig` object in `script.js` with your actual config
6. **Deploy**: Push changes to GitHub Pages

See `FIREBASE_SETUP.md` for detailed step-by-step instructions.

## Critical Implementation Details

### Meal Input Data Attributes
Every meal input requires three data attributes:
- `data-day`: sunday, monday, tuesday, wednesday, thursday, friday, saturday
- `data-person`: person1, person2, person3, person4, person5  
- `data-meal`: breakfast, lunch, dinner

### localStorage Keys
- `weeklyPlan`: Current week's meal planning data
- `meals`: Available meal options with ingredients
- `ingredients`: Available ingredients with quantities
- `personNames`: Custom names for each person
- `archive`: Saved weekly meal plans

### Data Migration
The app includes migration logic for ingredient format changes (array to object) in the constructor. When adding new data structures, similar migration patterns should be followed.

### Event Handling
All DOM manipulation happens through the single MealPlanner class instance. Event listeners are attached in `initializeEventListeners()` and use arrow functions to maintain `this` context.

## Common Modification Patterns

### Adding New Meal Types
1. Update HTML table structure with new input fields
2. Modify `saveMealInput()` and `loadWeeklyPlan()` to handle new meal types
3. Update `generateGroceryList()` and meal counting functions
4. Update archive preview rendering

### Modifying Table Layout
The table uses `meal-cell` CSS class with flexbox column layout. Each cell contains multiple `meal-input` elements stacked vertically with 8px gaps.

### Adding New Data Types
Follow the pattern: Add to constructor defaults → Add save/load logic → Add cleanup/migration if needed → Update relevant rendering methods.