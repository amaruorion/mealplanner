// Firebase configuration - Users need to replace with their own config
const firebaseConfig = {
  apiKey: "AIzaSyAXRyxXumodwN51LnjRE-d_U0Qyt3meW5I",
  authDomain: "meal-planner-b9513.firebaseapp.com",
  projectId: "meal-planner-b9513",
  storageBucket: "meal-planner-b9513.firebasestorage.app",
  messagingSenderId: "367526558701",
  appId: "1:367526558701:web:8d75b2734f63f145bb45e4",
  measurementId: "G-286KBGNJJ9"
};  
// Initialize Firebase
let db = null;
let isFirebaseEnabled = false;

try {
    // Check if Firebase config is properly set
    if (firebaseConfig.apiKey !== "your-api-key") {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        isFirebaseEnabled = true;
        console.log("Firebase initialized successfully");
    } else {
        console.log("Firebase not configured - using localStorage fallback");
    }
} catch (error) {
    console.log("Firebase initialization failed - using localStorage fallback:", error);
}

class MealPlanner {
    constructor() {
        this.isLoading = true;
        this.showLoadingScreen();
        this.initializeData();
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const mainApp = document.getElementById('main-app');
        if (loadingScreen && mainApp) {
            loadingScreen.style.display = 'block';
            mainApp.style.display = 'none';
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const mainApp = document.getElementById('main-app');
        if (loadingScreen && mainApp) {
            loadingScreen.style.display = 'none';
            mainApp.style.display = 'block';
        }
    }

    async initializeData() {
        try {
            // Load data from Firebase or localStorage
            this.meals = await this.loadFromStorage('meals') || [];
            this.ingredients = await this.loadFromStorage('ingredients') || {};

            // Migrate old array format to new object format
            if (Array.isArray(this.ingredients)) {
                const migratedIngredients = {};
                this.ingredients.forEach(ingredient => {
                    migratedIngredients[ingredient] = 1;
                });
                this.ingredients = migratedIngredients;
                await this.saveToStorage('ingredients', this.ingredients);
            }
            this.weeklyPlan = await this.loadFromStorage('weeklyPlan') || {};

            this.archive = await this.loadFromStorage('archive') || [];
            this.personNames = await this.loadFromStorage('personNames') || {
                person1: 'Person 1',
                person2: 'Person 2',
                person3: 'Person 3',
                person4: 'Person 4',
                person5: 'Person 5'
            };

            this.isLoading = false;
            this.hideLoadingScreen();

            this.initializeEventListeners();
            this.initializeStaticEventListeners();
            this.renderMealOptions();
            this.renderIngredients();
            this.renderAvailableMeals();
            this.cleanWeeklyPlan(); // Clean any phantom data
            this.loadWeeklyPlan();
            this.loadPersonNames();
            this.renderArchive();
            this.autoGenerateGroceryList();
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.hideLoadingScreen();
            alert('Failed to load app data. The app will work in local-only mode.');
        }
    }

    initializeEventListeners() {
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        this.attachMealInputListeners();
    }

    attachMealInputListeners() {
        document.querySelectorAll('.meal-input').forEach((input, index) => {
            // Define handlers to avoid anonymous function issues
            const inputHandler = (e) => {
                this.saveMealInput(e.target);
                this.checkMealRegistration(e.target);
            };

            const blurHandler = (e) => {
                this.saveMealInput(e.target);
                this.checkMealRegistration(e.target);
            };

            // Remove any existing listeners if they exist
            if (input._inputHandler) {
                input.removeEventListener('input', input._inputHandler);
            }
            if (input._blurHandler) {
                input.removeEventListener('blur', input._blurHandler);
            }

            // Store handlers on the element for future removal
            input._inputHandler = inputHandler;
            input._blurHandler = blurHandler;

            // Add new listeners
            input.addEventListener('input', inputHandler);
            input.addEventListener('blur', blurHandler);
        });

        document.querySelectorAll('.person-name-input').forEach(input => {
            input.addEventListener('input', (e) => this.savePersonName(e.target));
            input.addEventListener('blur', (e) => this.savePersonName(e.target));
        });
    }

    initializeStaticEventListeners() {
        document.getElementById('add-meal-btn').addEventListener('click', () => {
            document.getElementById('meal-form').classList.remove('hidden');
        });

        document.getElementById('save-meal-btn').addEventListener('click', () => this.saveMeal());
        document.getElementById('cancel-meal-btn').addEventListener('click', () => this.cancelMealForm());

        document.getElementById('add-ingredient-btn').addEventListener('click', () => {
            document.getElementById('ingredient-form').classList.remove('hidden');
            document.getElementById('ingredient-name').focus();
        });

        document.getElementById('save-ingredient-btn').addEventListener('click', () => this.saveIngredient());
        document.getElementById('cancel-ingredient-btn').addEventListener('click', () => this.cancelIngredientForm());

        // Add new event listeners for quick actions
        document.getElementById('save-current-btn').addEventListener('click', () => this.saveCurrentPlan());
        document.getElementById('clear-week-btn').addEventListener('click', () => this.clearWeek());
        document.getElementById('copy-week-btn').addEventListener('click', () => this.copyLastWeek());
        document.getElementById('save-week-btn').addEventListener('click', () => this.saveWeekToArchive());
        document.getElementById('reset-all-btn').addEventListener('click', () => this.resetAllData());

        // Archive event listeners
        document.getElementById('export-archive-btn').addEventListener('click', () => this.exportAllData());
        document.getElementById('import-data-btn').addEventListener('click', () => this.importData());
        document.getElementById('clear-archive-btn').addEventListener('click', () => this.clearArchive());

        document.getElementById('ingredient-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveIngredient();
        });

        // Ensure data is saved before page unload
        window.addEventListener('beforeunload', () => {
            this.saveAllData();
        });
    }

    async saveAllData() {
        await this.saveToStorage('weeklyPlan', this.weeklyPlan);
        await this.saveToStorage('meals', this.meals);
        await this.saveToStorage('ingredients', this.ingredients);
        await this.saveToStorage('personNames', this.personNames);
        await this.saveToStorage('archive', this.archive);
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');
    }

    async saveMealInput(input) {
        const day = input.dataset.day;
        const person = input.dataset.person;
        const mealType = input.dataset.meal;
        const mealName = input.value.trim();

        if (!this.weeklyPlan[day]) {
            this.weeklyPlan[day] = {};
        }
        if (!this.weeklyPlan[day][person]) {
            this.weeklyPlan[day][person] = {};
        }

        // Only save non-empty meal names
        if (mealName === '') {
            delete this.weeklyPlan[day][person][mealType];
            // Clean up empty person objects
            if (Object.keys(this.weeklyPlan[day][person]).length === 0) {
                delete this.weeklyPlan[day][person];
            }
            // Clean up empty day objects
            if (Object.keys(this.weeklyPlan[day]).length === 0) {
                delete this.weeklyPlan[day];
            }
        } else {
            this.weeklyPlan[day][person][mealType] = mealName;
        }

        // Immediately save to storage
        await this.saveToStorage('weeklyPlan', this.weeklyPlan);

        // Check meal registration and auto-generate grocery list when meals are entered
        this.checkMealRegistration(input);
        this.autoGenerateGroceryList();
    }

    async savePersonName(input) {
        const person = input.dataset.person;
        const personName = input.value.trim();

        this.personNames[person] = personName || `Person ${person.slice(-1)}`;
        await this.saveToStorage('personNames', this.personNames);
    }

    loadPersonNames() {
        Object.keys(this.personNames).forEach(person => {
            const input = document.querySelector(`[data-person="${person}"].person-name-input`);
            if (input) {
                input.value = this.personNames[person];
            }
        });
    }

    cleanWeeklyPlan() {

        const validPersons = ['person1', 'person2', 'person3', 'person4', 'person5'];

        // Remove invalid data and clean up structure
        Object.keys(this.weeklyPlan).forEach(day => {
            Object.keys(this.weeklyPlan[day]).forEach(key => {
                // Remove entries that aren't valid person IDs
                if (!validPersons.includes(key)) {
                    console.log(`Removing invalid key: ${day}.${key} = "${this.weeklyPlan[day][key]}"`);
                    delete this.weeklyPlan[day][key];
                }
                // Clean up valid person entries
                else if (validPersons.includes(key)) {
                    const personData = this.weeklyPlan[day][key];

                    // If it's a string (old format), leave it for migration in loadWeeklyPlan
                    if (typeof personData === 'string') {
                        if (!personData.trim()) {
                            console.log(`Removing empty string entry: ${day}.${key}`);
                            delete this.weeklyPlan[day][key];
                        }
                    }
                    // If it's an object (new format), clean up empty meal entries
                    else if (typeof personData === 'object' && personData !== null) {
                        Object.keys(personData).forEach(mealType => {
                            if (!personData[mealType] || !personData[mealType].trim()) {
                                console.log(`Removing empty meal entry: ${day}.${key}.${mealType}`);
                                delete personData[mealType];
                            }
                        });

                        // Remove person object if all meals are empty
                        if (Object.keys(personData).length === 0) {
                            console.log(`Removing empty person object: ${day}.${key}`);
                            delete this.weeklyPlan[day][key];
                        }
                    }
                    // Remove invalid data types
                    else {
                        console.log(`Removing invalid data type: ${day}.${key} (${typeof personData})`);
                        delete this.weeklyPlan[day][key];
                    }
                }
            });

            // Remove empty day objects
            if (Object.keys(this.weeklyPlan[day]).length === 0) {
                console.log(`Removing empty day: ${day}`);
                delete this.weeklyPlan[day];
            }
        });

        this.saveToStorage('weeklyPlan', this.weeklyPlan);
    }

    loadWeeklyPlan() {
        // First clear all meal inputs
        document.querySelectorAll('.meal-input').forEach(input => {
            input.value = '';
        });

        // Then load the weekly plan data
        Object.keys(this.weeklyPlan).forEach(day => {
            Object.keys(this.weeklyPlan[day]).forEach(person => {
                const personData = this.weeklyPlan[day][person];

                // Handle both old format (person directly has meal name) and new format (person has meal types)
                if (typeof personData === 'string') {
                    // Old format - treat as dinner
                    const input = document.querySelector(`[data-day="${day}"][data-person="${person}"][data-meal="dinner"].meal-input`);
                    if (input) {
                        input.value = personData;
                        this.checkMealRegistration(input);
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                } else if (typeof personData === 'object') {
                    // New format - has breakfast, lunch, dinner
                    Object.keys(personData).forEach(mealType => {
                        const input = document.querySelector(`[data-day="${day}"][data-person="${person}"][data-meal="${mealType}"].meal-input`);
                        if (input) {
                            input.value = personData[mealType];
                            this.checkMealRegistration(input);
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    });
                }
            });
        });

        // Reattach event listeners to ensure they work properly
        this.attachMealInputListeners();

        // Refresh meal highlighting to ensure all inputs are properly styled
        this.refreshMealHighlighting();


    }

    async saveMeal() {
        const nameInput = document.getElementById('meal-name');
        const ingredientsInput = document.getElementById('meal-ingredients');

        const name = nameInput.value.trim();
        const ingredientsText = ingredientsInput.value.trim();

        if (!name || !ingredientsText) {
            alert('Please fill in both meal name and ingredients.');
            return;
        }

        const ingredients = ingredientsText.split('\n').map(ing => ing.trim()).filter(ing => ing);

        const meal = {
            id: Date.now().toString(),
            name: name,
            ingredients: ingredients
        };

        this.meals.push(meal);
        await this.saveToStorage('meals', this.meals);

        this.renderMealOptions();
        this.renderAvailableMeals();
        this.refreshMealHighlighting();
        this.cancelMealForm();
        this.autoGenerateGroceryList();
    }

    cancelMealForm() {
        document.getElementById('meal-form').classList.add('hidden');
        document.getElementById('meal-name').value = '';
        document.getElementById('meal-ingredients').value = '';
    }

    deleteMeal(mealId) {
        if (confirm('Are you sure you want to delete this meal?')) {
            this.meals = this.meals.filter(meal => meal.id !== mealId);
            this.saveToStorage('meals', this.meals);
            this.renderMealOptions();
            this.renderAvailableMeals();
            this.refreshMealHighlighting();
            this.autoGenerateGroceryList();
        }
    }


    renderMealOptions() {
        const mealList = document.getElementById('meal-list');

        if (this.meals.length === 0) {
            mealList.innerHTML = '<div class="empty-state">No meals added yet. Click "Add New Meal" to get started!</div>';
            return;
        }

        mealList.innerHTML = this.meals.map(meal => `
            <div class="meal-item">
                <h4>${meal.name}</h4>
                <div class="ingredients">
                    <strong>Ingredients:</strong>
                    <ul>
                        ${meal.ingredients.map(ing => `<li>${ing}</li>`).join('')}
                    </ul>
                </div>
                <div class="meal-actions">
                    <button class="btn btn-danger btn-small" onclick="window.mealPlanner.deleteMeal('${meal.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    renderAvailableMeals() {
        const availableMealsDisplay = document.getElementById('available-meals-display');

        if (this.meals.length === 0) {
            availableMealsDisplay.innerHTML = '<div class="empty-state">No meals added yet. Go to "Meal Options" tab to add some meals!</div>';
            return;
        }

        availableMealsDisplay.innerHTML = `
            <div class="available-meals-list">
                ${this.meals.map(meal => `
                    <div class="available-meal-item">
                        <div class="available-meal-name">${meal.name}</div>
                        <div class="available-meal-ingredients">${meal.ingredients.slice(0, 3).join(', ')}${meal.ingredients.length > 3 ? '...' : ''}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    checkMealRegistration(input) {
        const mealName = input.value.trim();
        console.log(`🔍 CHECKING REGISTRATION: "${mealName}"`);

        if (!mealName) {
            input.classList.remove('unregistered');
            console.log(`    ✅ Empty meal, removing unregistered class`);
            return;
        }

        const isRegistered = this.meals.some(meal =>
            meal.name.toLowerCase() === mealName.toLowerCase()
        );

        // Also consider comma-separated ingredients as "registered"
        const isCommaSeparated = mealName.includes(',');
        
        console.log(`    📋 Is registered meal: ${isRegistered}`);
        console.log(`    🥗 Is comma-separated: ${isCommaSeparated}`);

        if (isRegistered || isCommaSeparated) {
            input.classList.remove('unregistered');
            console.log(`    ✅ ACCEPTED: Removing unregistered class`);
        } else {
            input.classList.add('unregistered');
            console.log(`    ❌ REJECTED: Adding unregistered class (RED)`);
        }
    }

    refreshMealHighlighting() {
        document.querySelectorAll('.meal-input').forEach(input => {
            this.checkMealRegistration(input);
        });
    }



    async saveIngredient() {
        const nameInput = document.getElementById('ingredient-name');
        const quantityInput = document.getElementById('ingredient-quantity');
        const name = nameInput.value.trim();
        const quantity = parseInt(quantityInput.value) || 1;

        if (!name) {
            alert('Please enter an ingredient name.');
            return;
        }

        if (quantity < 1) {
            alert('Quantity must be at least 1.');
            return;
        }

        if (this.ingredients[name]) {
            // If ingredient exists, add to existing quantity
            this.ingredients[name] += quantity;
        } else {
            // New ingredient
            this.ingredients[name] = quantity;
        }

        await this.saveToStorage('ingredients', this.ingredients);
        this.renderIngredients();
        this.cancelIngredientForm();
        this.autoGenerateGroceryList();
    }

    cancelIngredientForm() {
        document.getElementById('ingredient-form').classList.add('hidden');
        document.getElementById('ingredient-name').value = '';
        document.getElementById('ingredient-quantity').value = '1';
    }

    deleteIngredient(ingredient) {
        if (confirm(`Are you sure you want to remove "${ingredient}" from your available ingredients?`)) {
            delete this.ingredients[ingredient];
            this.saveToStorage('ingredients', this.ingredients);
            this.renderIngredients();
            this.autoGenerateGroceryList();
        }
    }

    renderIngredients() {
        const ingredientList = document.getElementById('ingredient-list');

        if (Object.keys(this.ingredients).length === 0) {
            ingredientList.innerHTML = '<li class="empty-state">No ingredients added yet. Click "Add Ingredient" to get started!</li>';
            return;
        }

        ingredientList.innerHTML = Object.entries(this.ingredients).map(([ingredient, quantity]) => `
            <li class="ingredient-item">
                <span>${ingredient} x${quantity}</span>
                <div class="ingredient-controls">
                    <button class="btn btn-secondary btn-small" onclick="window.mealPlanner.adjustIngredientQuantity('${ingredient}', -1)">-</button>
                    <button class="btn btn-secondary btn-small" onclick="window.mealPlanner.adjustIngredientQuantity('${ingredient}', 1)">+</button>
                    <button class="btn btn-danger btn-small" onclick="window.mealPlanner.deleteIngredient('${ingredient}')">Remove</button>
                </div>
            </li>
        `).join('');
    }

    adjustIngredientQuantity(ingredient, change) {
        if (this.ingredients[ingredient]) {
            this.ingredients[ingredient] += change;
            if (this.ingredients[ingredient] <= 0) {
                delete this.ingredients[ingredient];
            }
            this.saveToStorage('ingredients', this.ingredients);
            this.renderIngredients();
            this.autoGenerateGroceryList();
        }
    }

    autoGenerateGroceryList() {
        this.generateGroceryList();
        this.updateGroceryStatus();
    }

    processMealName(mealName, plannedMealNames, plannedMeals, commaSeparatedIngredients) {
        console.log(`🔍 PROCESSING MEAL: "${mealName}"`);
        plannedMealNames.push(mealName);
        
        // First, try to find it as a registered meal
        const meal = this.meals.find(m => m.name.toLowerCase() === mealName.toLowerCase());
        console.log(`📋 Available meals:`, this.meals.map(m => m.name));
        
        if (meal) {
            plannedMeals.push(meal);
            console.log(`    ✅ Found registered meal with ingredients:`, meal);
        } else {
            console.log(`    ❌ No registered meal found for: "${mealName}"`);
            // Check if it contains commas - if so, treat as comma-separated ingredients
            if (mealName.includes(',')) {
                const ingredients = mealName.split(',').map(ingredient => ingredient.trim()).filter(ingredient => ingredient);
                commaSeparatedIngredients.push(...ingredients);
                console.log(`    🥗 Parsed as comma-separated ingredients:`, ingredients);
                console.log(`    📦 Total comma-separated ingredients so far:`, commaSeparatedIngredients);
            } else {
                console.log(`    ⚠️ Not comma-separated, marking as unregistered: "${mealName}"`);
            }
        }
    }

    generateGroceryList() {
        const groceryItems = document.getElementById('grocery-items');
        const plannedMeals = [];
        const plannedMealNames = [];
        const commaSeparatedIngredients = [];

        console.log('=== GROCERY LIST GENERATION DEBUG ===');
        console.log('Full weeklyPlan data:', JSON.stringify(this.weeklyPlan, null, 2));

        // Also check what's actually in the HTML inputs
        console.log('=== CHECKING HTML INPUTS ===');
        document.querySelectorAll('.meal-input').forEach(input => {
            if (input.value && input.value.trim()) {
                console.log(`HTML Input ${input.dataset.day}/${input.dataset.person}: "${input.value}"`);
            }
        });

        Object.keys(this.weeklyPlan).forEach(day => {
            console.log(`Day ${day}:`, this.weeklyPlan[day]);
            Object.keys(this.weeklyPlan[day]).forEach(person => {
                const personData = this.weeklyPlan[day][person];

                // Handle both old format (person directly has meal name) and new format (person has meal types)
                if (typeof personData === 'string') {
                    // Old format - treat as dinner
                    const mealName = personData;
                    console.log(`  ${person} (dinner): "${mealName}" (length: ${mealName ? mealName.length : 0})`);
                    if (mealName && mealName.trim()) {
                        this.processMealName(mealName.trim(), plannedMealNames, plannedMeals, commaSeparatedIngredients);
                    }
                } else if (typeof personData === 'object') {
                    // New format - has breakfast, lunch, dinner
                    Object.keys(personData).forEach(mealType => {
                        const mealName = personData[mealType];
                        console.log(`  ${person} (${mealType}): "${mealName}" (length: ${mealName ? mealName.length : 0})`);
                        if (mealName && mealName.trim()) {
                            this.processMealName(mealName.trim(), plannedMealNames, plannedMeals, commaSeparatedIngredients);
                        }
                    });
                }
            });
        });

        console.log('Planned meal names:', plannedMealNames);
        console.log('Found meals with ingredients:', plannedMeals.map(m => m.name));
        console.log('Comma-separated ingredients found:', commaSeparatedIngredients);

        if (plannedMeals.length === 0 && commaSeparatedIngredients.length === 0) {
            groceryItems.innerHTML = '<div class="empty-state">No meals planned yet. Plan some meals first to generate your grocery list!</div>';
            return;
        }

        const allNeededIngredients = [];
        
        // Add ingredients from registered meals
        plannedMeals.forEach(meal => {
            allNeededIngredients.push(...meal.ingredients);
        });
        
        // Add comma-separated ingredients
        allNeededIngredients.push(...commaSeparatedIngredients);

        const ingredientCounts = {};
        allNeededIngredients.forEach(ingredient => {
            ingredientCounts[ingredient] = (ingredientCounts[ingredient] || 0) + 1;
        });

        const neededIngredients = [];
        const shortIngredients = [];

        Object.keys(ingredientCounts).forEach(ingredient => {
            const needed = ingredientCounts[ingredient];
            const available = this.ingredients[ingredient] || 0;

            if (available === 0) {
                neededIngredients.push({ name: ingredient, need: needed });
            } else if (available < needed) {
                shortIngredients.push({ name: ingredient, need: needed - available, have: available });
            }
        });

        if (neededIngredients.length === 0 && shortIngredients.length === 0) {
            groceryItems.innerHTML = `
                <h3>🎉 Great news!</h3>
                <p>You already have all the ingredients needed for your planned meals!</p>
                <div style="margin-top: 20px;">
                    <strong>Ingredients you'll be using:</strong>
                    <ul>
                        ${Object.keys(ingredientCounts).map(ing => `
                            <li>${ing}${ingredientCounts[ing] > 1 ? ` x${ingredientCounts[ing]}` : ''}</li>
                        `).join('')}
                    </ul>
                </div>
            `;
        } else {
            // Build description of what ingredients are from
            const sources = [];
            if (plannedMeals.length > 0) {
                sources.push(`registered meals: <em>${plannedMeals.map(m => m.name).join(', ')}</em>`);
            }
            if (commaSeparatedIngredients.length > 0) {
                const uniqueCommaSeparated = [...new Set(commaSeparatedIngredients)];
                sources.push(`direct ingredients: <em>${uniqueCommaSeparated.join(', ')}</em>`);
            }
            
            let groceryContent = `
                <h3>📝 Grocery List</h3>
                <p>Ingredients needed from ${sources.join(' and ')}</p>
            `;

            let hasSections = false;

            if (neededIngredients.length > 0) {
                if (hasSections) groceryContent += `<hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">`;
                groceryContent += `
                    <strong>🛒 Buy:</strong>
                    <ul>
                        ${neededIngredients.map(item => `
                            <li>${item.name}${item.need > 1 ? ` x${item.need}` : ''}</li>
                        `).join('')}
                    </ul>
                `;
                hasSections = true;
            }

            if (shortIngredients.length > 0) {
                if (hasSections) groceryContent += `<hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">`;
                groceryContent += `
                    <strong>⚠️ Need more:</strong>
                    <ul>
                        ${shortIngredients.map(item => `
                            <li>${item.name} x${item.need} (have ${item.have})</li>
                        `).join('')}
                    </ul>
                `;
                hasSections = true;
            }

            // Show what you have enough of
            const sufficientIngredients = Object.keys(ingredientCounts).filter(ing =>
                this.ingredients[ing] && this.ingredients[ing] >= ingredientCounts[ing]
            );

            if (sufficientIngredients.length > 0) {
                if (hasSections) groceryContent += `<hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">`;
                groceryContent += `
                    <strong>✅ You have enough:</strong>
                    <ul>
                        ${sufficientIngredients.map(ing => `
                            <li>${ing} (have ${this.ingredients[ing]}, need ${ingredientCounts[ing]})</li>
                        `).join('')}
                    </ul>
                `;
            }

            groceryItems.innerHTML = groceryContent;
        }
    }

    async saveToStorage(key, data) {
        if (isFirebaseEnabled) {
            try {
                await db.collection('mealPlanner').doc(key).set({ data: data });
                console.log(`Saved ${key} to Firebase`);
            } catch (error) {
                console.error(`Failed to save ${key} to Firebase:`, error);
                // Fallback to localStorage
                localStorage.setItem(key, JSON.stringify(data));
            }
        } else {
            localStorage.setItem(key, JSON.stringify(data));
        }
    }

    async loadFromStorage(key) {
        if (isFirebaseEnabled) {
            try {
                const doc = await db.collection('mealPlanner').doc(key).get();
                if (doc.exists) {
                    console.log(`Loaded ${key} from Firebase`);
                    return doc.data().data;
                } else {
                    console.log(`No ${key} found in Firebase`);
                    return null;
                }
            } catch (error) {
                console.error(`Failed to load ${key} from Firebase:`, error);
                // Fallback to localStorage
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : null;
            }
        } else {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        }
    }

    updateGroceryStatus() {
        const statusElement = document.getElementById('grocery-status-text');
        let plannedMealsCount = 0;

        Object.values(this.weeklyPlan).forEach(dayMeals => {
            Object.values(dayMeals).forEach(personData => {
                if (typeof personData === 'string') {
                    // Old format - count as 1 meal
                    if (personData.trim()) plannedMealsCount++;
                } else if (typeof personData === 'object') {
                    // New format - count all meal types
                    Object.values(personData).forEach(meal => {
                        if (meal && meal.trim()) plannedMealsCount++;
                    });
                }
            });
        });

        if (plannedMealsCount === 0) {
            statusElement.textContent = 'Plan some meals to see your grocery list';
            statusElement.style.color = '#7f8c8d';
        } else {
            statusElement.textContent = `Updated automatically (${plannedMealsCount} meals planned)`;
            statusElement.style.color = '#27ae60';
        }
    }

    clearWeek() {
        if (confirm('Are you sure you want to clear all planned meals for this week?')) {
            // Clear the weekly plan data
            this.weeklyPlan = {};
            this.saveToStorage('weeklyPlan', this.weeklyPlan);

            // Clear all meal input fields
            document.querySelectorAll('.meal-input').forEach(input => {
                input.value = '';
                input.classList.remove('unregistered');
            });

            // Refresh the UI
            this.autoGenerateGroceryList();
        }
    }

    resetAllData() {
        const confirmMessage = 'Are you sure you want to RESET ALL DATA?\n\nThis will permanently delete:\n• All planned meals\n• All meal options\n• All ingredients\n• All archived meal plans\n• All person names\n\nThis action cannot be undone!';

        if (confirm(confirmMessage)) {
            // Clear all data
            this.weeklyPlan = {};
            this.meals = [];
            this.ingredients = {};
            this.archive = [];
            this.personNames = {
                person1: 'Person 1',
                person2: 'Person 2',
                person3: 'Person 3',
                person4: 'Person 4',
                person5: 'Person 5'
            };

            // Clear localStorage
            localStorage.removeItem('weeklyPlan');
            localStorage.removeItem('meals');
            localStorage.removeItem('ingredients');
            localStorage.removeItem('personNames');
            localStorage.removeItem('archive');

            // Clear all UI elements
            document.querySelectorAll('.meal-input').forEach(input => {
                input.value = '';
                input.classList.remove('unregistered');
            });

            document.querySelectorAll('.person-name-input').forEach(input => {
                const person = input.dataset.person;
                input.value = this.personNames[person];
            });

            // Re-render all sections
            this.renderMealOptions();
            this.renderIngredients();
            this.renderAvailableMeals();
            this.renderArchive();
            this.autoGenerateGroceryList();

            alert('All data has been reset! The meal planner is now completely clean.');
        }
    }

    copyLastWeek() {
        if (this.archive.length === 0) {
            alert('No archived weeks found to copy from.');
            return;
        }

        const lastArchivedWeek = this.archive[this.archive.length - 1];
        if (confirm(`Copy meal plan from "${lastArchivedWeek.title}"? This will replace your current plan.`)) {
            this.weeklyPlan = { ...lastArchivedWeek.plan };
            this.saveToStorage('weeklyPlan', this.weeklyPlan);
            this.loadWeeklyPlan();
            this.autoGenerateGroceryList();
        }
    }

    saveCurrentPlan() {
        // Force save all current data to localStorage
        this.saveToStorage('weeklyPlan', this.weeklyPlan);
        this.saveToStorage('meals', this.meals);
        this.saveToStorage('ingredients', this.ingredients);
        this.saveToStorage('personNames', this.personNames);
        this.saveToStorage('archive', this.archive);

        // Count planned meals for feedback
        let mealCount = 0;
        Object.values(this.weeklyPlan).forEach(dayMeals => {
            Object.values(dayMeals).forEach(personData => {
                if (typeof personData === 'string') {
                    if (personData.trim()) mealCount++;
                } else if (typeof personData === 'object') {
                    Object.values(personData).forEach(meal => {
                        if (meal && meal.trim()) mealCount++;
                    });
                }
            });
        });

        // Provide visual feedback
        const saveBtn = document.getElementById('save-current-btn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '✓ Saved!';
        saveBtn.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';

        // Show notification
        if (mealCount > 0) {
            console.log(`Meal plan saved! ${mealCount} meals planned.`);
        } else {
            console.log('Meal plan saved! (No meals currently planned)');
        }

        // Reset button after 2 seconds
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.background = '';
        }, 2000);

        // Play success sound
        this.playBellSound();
    }

    saveWeekToArchive() {
        if (Object.keys(this.weeklyPlan).length === 0) {
            alert('No meals planned this week. Add some meals before archiving.');
            return;
        }

        let mealCount = 0;
        Object.values(this.weeklyPlan).forEach(dayMeals => {
            Object.values(dayMeals).forEach(personData => {
                if (typeof personData === 'string') {
                    if (personData.trim()) mealCount++;
                } else if (typeof personData === 'object') {
                    Object.values(personData).forEach(meal => {
                        if (meal && meal.trim()) mealCount++;
                    });
                }
            });
        });

        if (mealCount === 0) {
            alert('No meals planned this week. Add some meals before archiving.');
            return;
        }

        const title = prompt('Enter a title for this week\'s meal plan:', `Week of ${new Date().toLocaleDateString()}`);
        if (!title) return;

        const archivedWeek = {
            id: Date.now().toString(),
            title: title.trim(),
            date: new Date().toISOString(),
            plan: { ...this.weeklyPlan },
            mealCount: mealCount
        };

        this.archive.push(archivedWeek);
        this.saveToStorage('archive', this.archive);
        this.renderArchive();

        alert(`Week archived successfully as "${title}"!`);
    }

    renderArchive() {
        const archiveList = document.getElementById('archive-list');

        if (this.archive.length === 0) {
            archiveList.innerHTML = '<div class="empty-state">No archived meal plans yet. Save your current week to start building your archive!</div>';
            return;
        }

        archiveList.innerHTML = this.archive.slice().reverse().map(week => {
            const date = new Date(week.date).toLocaleDateString();
            return `
                <div class="archive-item">
                    <div class="archive-dropdown">
                        <div class="archive-header" onclick="window.mealPlanner.toggleArchivePreview('${week.id}')">
                            <div class="archive-title-section">
                                <div class="archive-item-title">${week.title}</div>
                                <div class="archive-item-date">Saved on ${date} • ${week.mealCount} dinners</div>
                            </div>
                            <div class="archive-actions">
                                <button class="btn btn-primary btn-archive" onclick="event.stopPropagation(); window.mealPlanner.loadArchivedWeek('${week.id}')">Load</button>
                                <button class="btn btn-danger btn-archive" onclick="event.stopPropagation(); window.mealPlanner.deleteArchivedWeek('${week.id}')">Delete</button>
                                <span class="archive-toggle">▼</span>
                            </div>
                        </div>
                        <div class="archive-preview" id="archive-preview-${week.id}" style="display: none;">
                            ${this.renderArchivePreviewTable(week.plan)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderArchivePreviewTable(plan) {
        const persons = ['person1', 'person2', 'person3', 'person4', 'person5'];
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        console.log('Rendering archive preview for plan:', plan);
        console.log('Current person names:', this.personNames);

        return `
            <div class="archive-table-container">
                <table class="archive-meal-table">
                    <thead>
                        <tr>
                            <th>Person</th>
                            ${dayNames.map(day => `<th>${day}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${persons.map(person => {
                            const personName = this.personNames[person] || `Person ${person.slice(-1)}`;

                            return `
                                <tr>
                                    <td class="archive-person-name">${personName}</td>
                                    ${days.map(day => {
                                        const dayPlan = plan[day] || {};
                                        const personData = dayPlan[person] || {};

                                        let cellContent = '';
                                        if (typeof personData === 'string') {
                                            // Old format - just show the meal
                                            cellContent = personData;
                                        } else if (typeof personData === 'object') {
                                            // New format - show B/L/D meals
                                            const meals = [];
                                            if (personData.breakfast) meals.push(`B: ${personData.breakfast}`);
                                            if (personData.lunch) meals.push(`L: ${personData.lunch}`);
                                            if (personData.dinner) meals.push(`D: ${personData.dinner}`);
                                            cellContent = meals.join('\n');
                                        }

                                        return `<td class="archive-meal-cell" title="${cellContent}">${cellContent}</td>`;
                                    }).join('')}
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    toggleArchivePreview(weekId) {
        const preview = document.getElementById(`archive-preview-${weekId}`);
        const toggle = document.querySelector(`#archive-preview-${weekId}`).parentElement.querySelector('.archive-toggle');

        if (!preview || !toggle) {
            console.error('Preview elements not found for weekId:', weekId);
            return;
        }

        const isHidden = preview.style.display === 'none' || preview.style.display === '';

        if (isHidden) {
            preview.style.display = 'block';
            toggle.textContent = '▲';
            console.log('Opened preview for week:', weekId);
        } else {
            preview.style.display = 'none';
            toggle.textContent = '▼';
            console.log('Closed preview for week:', weekId);
        }
    }

    loadArchivedWeek(weekId) {
        const week = this.archive.find(w => w.id === weekId);
        if (!week) {
            console.error('Week not found:', weekId);
            return;
        }

        if (confirm(`Load "${week.title}" into your current week? This will replace your current meal plan.`)) {
            console.log('Loading archived week:', week);

            // Clear current plan first
            this.weeklyPlan = {};

            // Deep copy the archived plan
            this.weeklyPlan = JSON.parse(JSON.stringify(week.plan));

            // Save to storage
            this.saveToStorage('weeklyPlan', this.weeklyPlan);

            // Force reload the UI
            this.loadWeeklyPlan();
            this.autoGenerateGroceryList();

            // Switch to weekly plan tab
            this.switchTab('weekly-plan');

            console.log('Archive loaded successfully. New weekly plan:', this.weeklyPlan);
        }
    }

    deleteArchivedWeek(weekId) {
        const week = this.archive.find(w => w.id === weekId);
        if (!week) return;

        if (confirm(`Are you sure you want to delete "${week.title}" from your archive?`)) {
            this.archive = this.archive.filter(w => w.id !== weekId);
            this.saveToStorage('archive', this.archive);
            this.renderArchive();
        }
    }

    exportAllData() {
        const exportData = {
            exportDate: new Date().toISOString(),
            weeklyPlan: this.weeklyPlan,
            meals: this.meals,
            ingredients: this.ingredients,
            personNames: this.personNames,
            archive: this.archive
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `meal-planner-data-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        URL.revokeObjectURL(url);

        alert('All data exported successfully! You can import this file on another computer.');
    }

    importData() {
        const fileInput = document.getElementById('import-file-input');
        fileInput.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);

                    if (confirm('This will replace ALL current data with the imported data. Are you sure?')) {
                        // Import all data
                        this.weeklyPlan = importedData.weeklyPlan || {};
                        this.meals = importedData.meals || [];
                        this.ingredients = importedData.ingredients || {};
                        this.personNames = importedData.personNames || {
                            person1: 'Person 1',
                            person2: 'Person 2',
                            person3: 'Person 3',
                            person4: 'Person 4',
                            person5: 'Person 5'
                        };
                        this.archive = importedData.archive || [];

                        // Save to localStorage
                        this.saveAllData();

                        // Refresh all UI
                        this.loadWeeklyPlan();
                        this.loadPersonNames();
                        this.renderMealOptions();
                        this.renderIngredients();
                        this.renderAvailableMeals();
                        this.renderArchive();
                        this.autoGenerateGroceryList();

                        alert('Data imported successfully!');
                    }
                } catch (error) {
                    alert('Error importing data. Please make sure you selected a valid meal planner export file.');
                }
            };
            reader.readAsText(file);

            // Reset file input
            fileInput.value = '';
        };

        fileInput.click();
    }

    clearArchive() {
        if (this.archive.length === 0) {
            alert('Archive is already empty.');
            return;
        }

        if (confirm('Are you sure you want to clear your entire archive? This cannot be undone.')) {
            this.archive = [];
            this.saveToStorage('archive', this.archive);
            this.renderArchive();
        }
    }

    debugData() {
        console.log('=== MEAL PLANNER DEBUG DATA ===');
        console.log('Weekly Plan:', JSON.stringify(this.weeklyPlan, null, 2));
        console.log('Meals:', this.meals);
        console.log('Ingredients:', this.ingredients);
        console.log('Person Names:', this.personNames);
        console.log('Archive:', this.archive);

        // Check HTML inputs vs stored data
        console.log('=== HTML vs STORED DATA COMPARISON ===');
        document.querySelectorAll('.meal-input').forEach(input => {
            const day = input.dataset.day;
            const person = input.dataset.person;
            const htmlValue = input.value;
            const storedValue = this.weeklyPlan[day] && this.weeklyPlan[day][person] ? this.weeklyPlan[day][person] : '';

            if (htmlValue !== storedValue) {
                console.log(`MISMATCH: ${day}/${person} - HTML: "${htmlValue}" vs Stored: "${storedValue}"`);
            }
        });

        // Count planned meals
        let plannedMealsCount = 0;
        Object.values(this.weeklyPlan).forEach(dayMeals => {
            Object.values(dayMeals).forEach(personData => {
                if (typeof personData === 'string') {
                    if (personData.trim()) plannedMealsCount++;
                } else if (typeof personData === 'object') {
                    Object.values(personData).forEach(meal => {
                        if (meal && meal.trim()) plannedMealsCount++;
                    });
                }
            });
        });

        console.log('Total planned meals:', plannedMealsCount);

        // Offer to completely reset
        if (confirm('Force complete data reset? This will clear all meal planning data and reload the page.')) {
            localStorage.removeItem('weeklyPlan');
            localStorage.removeItem('meals');
            localStorage.removeItem('ingredients');
            localStorage.removeItem('personNames');
            localStorage.removeItem('archive');
            location.reload();
        } else {
            // Just force clean and regenerate
            this.cleanWeeklyPlan();
            this.autoGenerateGroceryList();
            alert(`Debug data logged to console. Found ${plannedMealsCount} planned meals.`);
        }
    }

    playBellSound() {
        try {
            // Create audio context for bell sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create bell sound using oscillators
            const oscillator1 = audioContext.createOscillator();
            const oscillator2 = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            // Bell frequencies (simulating a pleasant bell sound)
            oscillator1.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator2.frequency.setValueAtTime(1200, audioContext.currentTime);

            // Connect audio nodes
            oscillator1.connect(gainNode);
            oscillator2.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Set volume and fade out
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            // Start and stop oscillators
            oscillator1.start(audioContext.currentTime);
            oscillator2.start(audioContext.currentTime);
            oscillator1.stop(audioContext.currentTime + 0.5);
            oscillator2.stop(audioContext.currentTime + 0.5);

        } catch (error) {
            // Fallback: try to use a simple beep
            console.log('Bell sound notification: Task completed!');
        }
    }
}

// Wait for DOM to be ready before initializing
document.addEventListener('DOMContentLoaded', () => {
    window.mealPlanner = new MealPlanner();
});
