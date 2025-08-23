# Changelog

All notable changes to the Portfolio CMS Telegram Bot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
