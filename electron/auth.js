const supabase = require('./supabaseClient');
const { isNetworkError, NETWORK_ERROR_PREFIX } = require('./networkError');

// Supabase's raw auth error text is written for developers, not end users
// (e.g. "User with this information (email address, phone number) cannot be
// created again."). It exposes a stable `error.code` alongside that message
// (see https://supabase.com/docs/guides/auth/debugging/error-codes) — this
// translates the ones this app can actually hit into plain language. Do this
// here, in the main process, while the full error object (with .code) is
// still available — only the message string survives crossing the IPC
// boundary to the renderer, so any translation has to happen before that.
const FRIENDLY_AUTH_ERRORS = {
  invalid_credentials: 'Incorrect email or password.',
  user_already_exists: 'An account with that email already exists — try signing in instead.',
  email_exists: 'An account with that email already exists — try signing in instead.',
  email_not_confirmed: 'Please confirm your email before signing in — check your inbox for the confirmation link.',
  email_address_invalid: 'Please enter a valid email address.',
  weak_password: 'That password is too weak — try a longer or more complex one.',
  same_password: 'That’s already your current password — please choose a different one.',
  over_email_send_rate_limit: 'Too many emails sent to that address recently — please wait a bit before trying again.',
  over_request_rate_limit: 'Too many attempts — please wait a bit and try again.',
  validation_failed: 'Please check the information you entered and try again.',
};

// See database.js's check() — Supabase errors are plain objects and lose
// their message crossing the IPC boundary unless wrapped in a real Error.
// A network failure (e.g. getSession()'s background token refresh failing
// offline surfaces as auth-js's typed AuthRetryableFetchError) gets a
// recognizable prefix instead of a friendly-auth-error lookup, since none of
// those codes apply to a connectivity problem.
function check(error) {
  if (!error) return;
  const message = FRIENDLY_AUTH_ERRORS[error.code] || error.message || JSON.stringify(error);
  throw new Error(isNetworkError(error) ? NETWORK_ERROR_PREFIX + message : message);
}

async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Brings the user straight back into the running app when they click
    // the confirmation link, instead of a dead browser tab — see the
    // gamevault:// handling in main.js.
    options: { emailRedirectTo: 'gamevault://auth-callback' },
  });
  check(error);
  return data.session;
}

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  check(error);
  return data.session;
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  check(error);
  return { success: true };
}

// Runs a security-definer Postgres function (see
// supabase/migrations/0003_delete_own_account.sql) that's hardcoded to only
// ever delete auth.uid() — the anon key alone can't delete from auth.users,
// so this avoids needing the service_role key in the app at all.
async function deleteAccount() {
  const { error } = await supabase.rpc('delete_own_account');
  check(error);
  // The account (and its session) no longer exists server-side at this
  // point — signOut just clears the local cached session. Best-effort: the
  // deletion itself already succeeded, so don't fail the whole operation if
  // this network call has trouble.
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Post-deletion signOut failed (non-fatal):', err);
  }
  return { success: true };
}

// Sends Supabase's "Reset your password" email. Clicking that link goes
// through the same gamevault:// deep link as email confirmation, but
// Supabase fires a PASSWORD_RECOVERY auth event for it instead of SIGNED_IN
// so the renderer knows to show the "set a new password" screen rather than
// just dropping the user into their library.
async function resetPasswordForEmail(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'gamevault://auth-callback',
  });
  check(error);
  return { success: true };
}

// Called once the user's landed back in the app via the recovery link (a
// valid session already exists at this point) to actually set the new
// password they typed in.
async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  check(error);
  return { success: true };
}

async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  check(error);
  return data.session;
}

// Called from the gamevault:// deep link handler in main.js once the
// confirmation email's redirect hands back tokens (implicit-flow style, in
// the URL fragment).
async function setSessionFromTokens(accessToken, refreshToken) {
  const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  check(error);
}

// Fallback for the PKCE-style redirect (a `?code=` param instead of tokens
// in the fragment), in case that's what a given Supabase project uses.
async function exchangeCodeForSession(code) {
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  check(error);
}

// Lets main.js forward login/logout/token-refresh/recovery events to the
// renderer — event is one of Supabase's auth event names (SIGNED_IN,
// SIGNED_OUT, TOKEN_REFRESHED, PASSWORD_RECOVERY, ...).
function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => subscription.unsubscribe();
}

module.exports = {
  signUp, signIn, signOut, deleteAccount, getSession, onAuthStateChange,
  setSessionFromTokens, exchangeCodeForSession,
  resetPasswordForEmail, updatePassword,
};
