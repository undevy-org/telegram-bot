# Content Model Guide (`content.json`)

This document provides a definitive guide to the structure of the `content.json` file. This file is the database that the Telegram Bot CMS reads from and writes to.

## 1. Top-Level Structure

The `content.json` file is a JSON object organized into two primary key types:
1.  **Personalized Profiles:** Keys in all-caps (e.g., `PROFILE123`). Each represents a unique experience for a specific access code.
2.  **Global Data:** A single `GLOBAL_DATA` key containing a library of all shared content (projects, skills, etc.).

This structure allows for maximum flexibility and minimal content duplication.

## 2. Demo Content

The main portfolio repository includes a `config/demo-content.json` file. This file serves two purposes:
1.  **Structural Reference:** It is a complete, well-structured example of a valid `content.json` file and can be used as a template.
2.  **Demo Mode:** It is used by the portfolio application when it is accessed in demo mode.

## 3. Personalized Profile Schema

Each personalized profile (e.g., `"PROFILE123": { ... }`) contains the configuration for a single user journey.

### 3.1. `meta` object
This object is the control panel for the session.
-   `company`: The visitor's name or company.
-   `timeline`: The ID of the experience timeline to load from `GLOBAL_DATA.experience`.
-   `tone`: The tone of voice for introductory text (e.g., `technical`, `casual`).
-   `cases`: An array of case study IDs to display from `GLOBAL_DATA.case_studies`.

### 3.2. `profile` object
Contains personalized content for the `Introduction` screen, including `summary`, `attributes`, and `status`.

### 3.3. `introduction` object
Contains different versions of the introductory text, selected based on the `meta.tone` key.

---

## 4. Global Data Schema (`GLOBAL_DATA`)

This object is a comprehensive library of all reusable content blocks. It includes:
-   **`menu`**: Defines the main navigation.
-   **`experience`**: A dictionary of different career timeline scenarios.
-   **`role_details`**: Detailed information for each role in the timelines.
-   **`case_studies`**: A dictionary of all available case studies.
-   **`case_details`**: The full content for each case study.
-   **`skills`** and **`skill_details`**: Master lists of skills and their details.
-   **`side_projects`**, **`public_speaking`**, **`contact`**: Additional content sections.

---

## 5. How Content is Managed by the Bot

This Telegram bot provides a command-based interface to manage nearly all sections within this content model, particularly `case_studies` and `case_details`. The bot interacts with the portfolio's secure Admin API to read the current `content.json` file, make changes, and write the updated version back to the server. All write operations automatically trigger a timestamped backup for safety.