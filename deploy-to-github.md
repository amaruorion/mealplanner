# Deploy Meal Planner to GitHub Pages

## Using Git Command Line

1. **Initialize git repository in your project folder:**
```bash
cd /mnt/c/Users/Amaru/mealplanner
git init
git add .
git commit -m "Initial commit: Add meal planner"
```

2. **Create repository on GitHub** (via web interface)
   - Go to github.com → New repository
   - Name it (e.g., "meal-planner")
   - Make it Public
   - Don't initialize with README (since you already have files)

3. **Connect your local repo to GitHub:**
```bash
git remote add origin https://github.com/YOURUSERNAME/YOURREPONAME.git
git branch -M main
git push -u origin main
```

4. **Enable GitHub Pages:**
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: main, folder: / (root)
   - Save

## Files to include:
- index.html (main page)
- script.js (application logic)
- style.css (styling)
- CLAUDE.md (documentation - optional)

## Your website will be available at:
https://YOURUSERNAME.github.io/YOURREPONAME

## Tips:
- Make sure index.html is in the root directory
- Repository must be Public for free GitHub Pages
- Changes take a few minutes to deploy
- You can use a custom domain if desired