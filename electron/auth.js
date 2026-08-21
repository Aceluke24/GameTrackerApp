const supabase = require('./supabaseClient');

// See database.js's check() — Supabase errors are plain objects and lose
// their message crossing the IPC boundary unless wrapped in a real Error.
function check(error) {
  if (error) throw new Error(error.message || JSON.stringify(error));
}

async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
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

async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  check(error);
  return data.session;
}

// Lets main.js forward login/logout/token-refresh events to the renderer.
function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => subscription.unsubscribe();
}

module.exports = { signUp, signIn, signOut, getSession, onAuthStateChange };
