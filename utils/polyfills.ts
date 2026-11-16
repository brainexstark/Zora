// ============================================================
// POLYFILLS - must be imported before anything uses Supabase
// ============================================================
// react-native-url-polyfill patches the global URL/URLSearchParams so
// Supabase's JS client can parse connection strings.
import "react-native-url-polyfill/auto";
