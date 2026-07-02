# Task Manager

An elegant, modern, and real-time personal task record application built with **React**, **Convex**, and **Vite**.

## Features

- **List View**: View and filter tasks by search query, project, status, and urgency levels.
- **Interactive Kanban Board**: Drag and drop tasks to update statuses (`To Do`, `Doing`, `Blocked`, `Done`) in real-time.
- **Projects Portfolio**: Track completion rates, task distributions, and project summaries dynamically.
- **Real-Time Database Sync**: Powered by Convex for instant data synchronization across all instances.
- **Interactive Analytics**: Monitor total task counts, average completion times, completions per project, and completions by week.
- **Weekly Reports**: View grouped summaries of completed tasks for any given week.
- **Responsive Theme**: Premium typography (Georgia / Source Serif) and sleek interactive UI.

## Tech Stack

- **Frontend**: React 18, Vite, Vanilla CSS
- **Backend/Database**: Convex (real-time serverless database)

## Getting Started

### Prerequisites

Make sure you have Node.js and the Convex CLI installed.

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Run the Convex development server to link/initialize the backend:
   ```bash
   npx convex dev
   ```
   *This command will prompt you to create/link a Convex project and will automatically generate the `.env.local` file with the server URLs.*

3. Start the Vite React development server:
   ```bash
   npm run dev
   ```

## Folder Structure

```text
task-manager/
├── ARCHITECTURE.md       # Full architecture and design documentation
├── convex/               # Convex database schema, queries, and mutations
│   ├── schema.ts         # Tables for tasks and projects
│   ├── tasks.ts          # Task mutations and query logic
│   └── projects.ts       # Project mutations and query logic
└── src/
    ├── App.jsx           # Main React UI orchestrator
    ├── index.css         # Styling rules, layouts, and animations
    └── main.jsx          # Entrypoint wrapping App with ConvexProvider
```
