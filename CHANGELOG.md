# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.0.0](https://github.com/undevy-org/telegram-bot/compare/v4.2.2...v1.0.0) (2025-08-23)


### Features

* add CI/CD pipelines for automated deployment ([fc571e8](https://github.com/undevy-org/telegram-bot/commit/fc571e880ba12febd7274fa4c097f13853aae7a4))
* add versioning and release automation ([188dd47](https://github.com/undevy-org/telegram-bot/commit/188dd470ad6a05a8cda1e9123c3b43956592921d))


### Bug Fixes

* Analytics disabled for dev mode ([5bedc18](https://github.com/undevy-org/telegram-bot/commit/5bedc184b36271775ea9637c82ac10940018e27a))
* **ci:** align deploy method with working portfolio pipeline ([4f3a2e9](https://github.com/undevy-org/telegram-bot/commit/4f3a2e9f104a3655ba4ba0629215c56785919ed7))
* resolve tar archive creation issue ([2752509](https://github.com/undevy-org/telegram-bot/commit/275250987850db2c565a6aa5b52cb40e96f774fe))
* simplify deployment pipeline and fix SSH issues ([3100a48](https://github.com/undevy-org/telegram-bot/commit/3100a481167eae02a06d72a7939ff57a060c42d0))
* simplify deployment pipeline and fix SSH issues ([be31f40](https://github.com/undevy-org/telegram-bot/commit/be31f4070c4f0766a9bf8acb02f99a50eb4c435d))

## [1.0.0] - 2024-08-22

### Added
- Initial release as standalone repository
- Extracted from portfolio monorepo with preserved Git history
- Complete CMS functionality via Telegram commands
- Real-time analytics integration with Matomo
- Automatic content versioning and backups
- Interactive wizards for content creation
- GitHub Actions CI/CD pipeline

### Features
- `/start` - Bot initialization
- `/help` - Command reference
- `/status` - System health check
- `/stats` - Portfolio statistics
- `/list` - View all cases
- `/add_case` - Create new case with wizard
- `/edit_case_[id]` - Edit existing case
- `/delete_case_[id]` - Remove case
- `/history` - View change history
- `/restore` - Restore from backup
- `/test_api` - API connectivity test
- `/test_matomo` - Analytics connectivity test

### Technical
- Modular architecture with clear separation of concerns
- grammY framework for Telegram integration
- Environment-based configuration
- PM2 process management
- Automated deployment on push to main

[1.0.0]: https://github.com/undevy-org/telegram-bot/releases/tag/v1.0.0
