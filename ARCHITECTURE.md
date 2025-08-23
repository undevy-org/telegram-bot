# Telegram Bot CMS: System Architecture

This document provides a technical overview of the Telegram Bot CMS, detailing its internal structure, data flow, and interaction with the main portfolio application.

## 1. High-Level Overview

The bot is a standalone Node.js application built with the [grammY](https://grammy.dev/) framework. It serves as a headless Content Management System (CMS), providing a command-based interface via Telegram to manage a `content.json` file on a remote server.

### Core Principles
-   **Decoupled:** The bot is completely separate from the portfolio frontend. It can be run on a different server and updated independently.
-   **Secure:** Access is restricted by Telegram User ID. All communication with the portfolio's API is authenticated via a Bearer Token.
-   **Stateful Conversations:** The bot uses an in-memory state manager to guide users through multi-step processes like creating a new case study.
-   **Resilient:** It uses PM2 for process management, ensuring it stays online and restarts automatically on failure or server reboot.

## 2. Data & Command Flow

The primary function of the bot is to act as a secure intermediary between a Telegram user and the portfolio's Admin API.

```mermaid
graph TD
    subgraph Telegram
        A[Admin User]
    end

    subgraph "Bot Application (Node.js / grammY)"
        B[Middleware: Auth]
        C[Command Router]
        D[Conversation Handler]
        E[API Service]
    end

    subgraph "Portfolio Server"
        F[Portfolio Admin API<br>(/api/admin/content)]
        G[content.json]
        H[Backup Directory]
    end

    A -- "/add_case" --> B;
    B -- "User ID Check" --> C;
    C -- "Route to command" --> D;
    D -- "Guides user, collects data" --> E;
    E -- "PUT /api/admin/content<br>w/ Bearer Token" --> F;
    F -- "Validates & writes" --> G;
    F -- "Creates backup" --> H;
```

1.  A user sends a command (e.g., `/add_case`) to the bot.
2.  The **Authentication Middleware** intercepts the request and verifies the user's `ADMIN_USER_ID`.
3.  The **Command Router** directs the command to the appropriate handler function.
4.  For multi-step commands, the **Conversation Handler** takes over, managing state and prompting the user for more information.
5.  Once all data is collected, the **API Service** constructs a request to the portfolio's Admin API.
6.  The portfolio's **Admin API** receives the request, validates the Bearer Token, performs the requested action (e.g., updates `content.json`), creates a backup, and returns a success response.

## 3. Directory Structure & Key Modules

The codebase is organized by function to ensure separation of concerns.

-   `bot.js`: The main application entry point. Initializes the bot, registers middleware, commands, and handlers.
-   `commands/`: Contains handler functions for each bot command (e.g., `content.js` for `/add_case`, `system.js` for `/status`).
-   `handlers/`: Manages complex interactions, such as multi-step conversations (`conversations.js`) and callback queries from inline buttons (`callbacks.js`).
-   `services/`: Houses logic for interacting with external APIs.
    -   `api.js`: Handles all communication with the portfolio's Admin API.
    -   `matomo.js`: Manages requests to the Matomo Analytics API for visitor data.
-   `middleware/`: Contains middleware functions like `auth.js` that process requests before they reach command handlers.
-   `utils/`: A collection of helper functions for formatting, validation, and other reusable tasks.

## 4. Content Versioning & Backups

The bot ensures data integrity through an automated backup system, which is orchestrated by the portfolio's backend API.

-   **Trigger:** Every successful write operation (create, update, delete) via the API triggers a backup.
-   **Mechanism:** Before overwriting `content.json`, the API first creates a timestamped copy of the current file (e.g., `content-2024-08-23T12:30:00.json`) and saves it to a backup directory.
-   **User Interface:** The bot provides commands like `/history` and `/rollback` that allow the admin to view backup history and restore a previous version directly from Telegram.

## 5. Analytics Integration

The bot can connect to a Matomo analytics instance to provide real-time visitor notifications.

-   **Monitoring:** A background process in `analytics.js` polls the Matomo API every few minutes for new visits.
-   **Notification:** When a new visit is detected, the bot formats the key details (location, pages viewed, duration) and sends a notification to the admin via Telegram.
-   **Decoupling:** This feature is optional and can be disabled via environment variables without affecting the bot's core CMS functionality.