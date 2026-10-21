# Pulse

A static, dark-mode weight and workout dashboard. Log a day in the form and the dashboard updates its charts instantly.

**Live demo:** https://davidbitner.github.io/weight/

## Features

- Log form with Brazilian date format (dd/mm/yyyy), time (mm:ss), calories, distance, speed, incline and weight
- Weight comparison against yesterday, last week, last month and the start, plus a goal progress bar
- Weight curve with 7-entry moving average and hover tooltip
- GitHub-style consistency calendar in two modes: activity and weight trend, with a click-through day detail
- Weekly volume bars, records and streaks
- Backup, import and demo data from the Data dialog

## Usage

Open `index.html` in a browser. No build step and no dependencies.

Data is stored in the browser's `localStorage`. Use the Data dialog to copy a JSON backup.

## Structure

- `index.html` markup
- `styles.css` styles
- `app.js` logic and rendering
