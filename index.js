// Custom entry point. Background tasks (office geofence reminder) must be defined at
// module scope as soon as the JS bundle loads. When the OS wakes a killed app for a
// geofence event it runs the bundle headlessly and never mounts a screen, so defining
// the task inside a route/layout means the event is silently dropped.
import "./src/lib/office-checkin-reminder";
import "expo-router/entry";
