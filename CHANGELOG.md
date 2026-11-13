# Changelog

## v26.11.3 - 2026-11-14

### New

- **Work timer:** after you check in, the dashboard shows a live countdown of the time left in your workday, with a progress bar.
- **Admin dashboard switch:** admins now open on their own dashboard and can flip to the admin dashboard with a button beside the location status. Your choice is remembered until you switch back or log out.

### Changed

- **Late check-in** is now counted from 10:30 AM (Bangladesh time) for every kind of check-in, including attendance marked or edited by an admin. Status and late minutes are worked out automatically.

## v26.11.2 - 2026-11-10

### New

- **Missed check-out reminder:** if you checked in but never checked out (any earlier day, or today after 7 PM), the dashboard asks you to log your check-out time.
- **System settings (admin):** set the office arrival reminder time for everyone from the admin menu.

### Changed

- **Weekly timesheet** now runs Saturday to Friday.

### Fixed

- **Admin attendance:** marking or editing attendance for a past date no longer saves the check-in and check-out times on today's date.
- **Office check-in reminders** now fire when the app is closed.

## v26.11.1 - 2026-11-01

### New

- **Notifications:** in-app notification list with an unread count, and options to manage them.
- **Profile photo:** upload an avatar, now shown across your profile.
- **Office check-in reminders:** get a notification when you arrive at the office (geofencing) so you don't forget to check in.
- **About screen:** shows the app version and support contact.
- **Half-day casual leave:** mark casual leave as a half day.

## v26.10.4 - 2026-10-28

### New

- **Leave balances (admin):** searchable, paginated list of every employee's sick and casual leave balance — allocated, carried forward, earned, used and remaining.
- **Opening-balance correction:** admins can adjust an employee's used sick or casual leave days directly from their profile, for leave taken before the app was in use.
- **Earned leave backfill:** re-scan past attendance to grant earned casual days for weekend or holiday work that predates this feature.
- **Switch User** is now only shown to admins who have been granted that permission, instead of to every admin.

### Changed

- **Apply Casual Leave** now shares the same screen as Apply Sick Leave.
- **Dashboard quick actions:** Timesheet moved to the top of your personal actions, Casual Leave switched from green to red, and admin action tiles now line up in even rows of three.

## v26.10.3 - 2026-10-26

### New

- **Casual leave:** apply, track your balance (allocated, carried forward, used, remaining) and cancel pending requests.
- **Leave tab:** sick and casual leave in one place, with yearly balance, status filters and request history.
- **Holidays:** admins can add and manage holidays, and exclude specific employees or teams.
- **Admin leave tools:** approve or reject casual leave, mark leave on an employee's behalf, and see an employee's leave balance from their profile.
- **Timesheet:** logging time now shows whether you're at the office.
- **Updates:** in-app notice when a new version is available.

### Changed

- **New look** across the app: dashboard, sign-in, headers, attendance and leave screens.
- **Attendance statuses** are now Present, Late, Holiday, Sick Leave, Casual Leave and Weekend.
- **Admin attendance marking** sets the status automatically: Late after 10:30 AM, otherwise Present.
- **Timesheet** lets you log time for today, or for an earlier day that has a check-in but no check-out.
- **Attendance list:** leave and holiday records can no longer be edited or deleted from it.

### Fixed

- The Dashboard tab wasn't highlighted in the bottom bar.
- The timesheet showed yesterday as today for the first hours after midnight.
