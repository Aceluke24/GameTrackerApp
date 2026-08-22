const supabase = require('./supabaseClient');

// See database.js's check() — Supabase errors are plain objects and lose
// their message crossing the IPC boundary unless wrapped in a real Error.
function check(error) {
  if (error) throw new Error(error.message || JSON.stringify(error));
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

// Lets main.js forward login/logout/token-refresh events to the renderer.
function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => subscription.unsubscribe();
}

module.exports = {
  signUp, signIn, signOut, deleteAccount, getSession, onAuthStateChange,
  setSessionFromTokens, exchangeCodeForSession,
};
