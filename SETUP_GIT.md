# Git Setup Instructions

## Initial Git Setup

1. Open a terminal (Git Bash, PowerShell, or Command Prompt) in the project root directory.

2. Initialize the repository:
```bash
git init
```

3. Add all files:
```bash
git add .
```

4. Create your first commit:
```bash
git commit -m "Initial commit: Mystery game application"
```

## Optional: Connect to GitHub

1. Create a new repository on GitHub (don't initialize with README)

2. Connect your local repository:
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

3. Push your code:
```bash
git branch -M main
git push -u origin main
```

## Git Configuration (if not already set)

If this is your first time using Git on this computer:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

