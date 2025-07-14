# 📓 Changelog – GistHub

All notable changes to the project will be documented here.

---

## [1.5.0] - 2025-07-14

### Added
- Post like/unlike system
- Comments system with replies
- Most liked posts page
- Follow/unfollow users
- User profile page with editable bio and avatar
- Anonymous posting logic (only Sundays)
- JWT login and user sessions

### Changed
- Reorganized `feed` UI
- Refactored authentication flow
- Added toast notifications on actions

### Fixed
- Bug where profile picture didn't save on first upload
- Sunday check bug on anonymous toggle

---

## [1.0.0] - 2025-07-05

### Added
- Initial authentication (register/login)
- Post feed with image upload
- Basic UI layout with sidebar
- MongoDB models (User, Post)
