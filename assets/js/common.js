// assets/js/common.js (lean, index.html-compatible)
// Requires supabase-config.js to be loaded first.

// ----------------- Auth UI toggles -----------------
window.showLogin = () => {
  const lf = document.getElementById('login-form');
  const sf = document.getElementById('signup-form');
  lf?.classList.add('active');
  sf?.classList.remove('active');
  document.querySelectorAll('.auth-tab')?.forEach(t => t.classList.remove('active'));
  const tabs = document.querySelectorAll('.auth-tab');
  if (tabs[0]) tabs[0].classList.add('active');
}; // keeps index.html behavior [attached_file:195][attached_file:194]

window.showSignup = () => {
  const lf = document.getElementById('login-form');
  const sf = document.getElementById('signup-form');
  sf?.classList.add('active');
  lf?.classList.remove('active');
  document.querySelectorAll('.auth-tab')?.forEach(t => t.classList.remove('active'));
  const tabs = document.querySelectorAll('.auth-tab');
  if (tabs[1]) tabs[1].classList.add('active');
}; // matches current index.html toggle code [attached_file:195][attached_file:194]

// Conditional signup fields by role (student/company)
window.addEventListener('DOMContentLoaded', () => {
  const roleSel = document.getElementById('signup-role');
  if (roleSel) {
    roleSel.addEventListener('change', (e) => {
      const role = e.target.value;
      const studentFields = document.getElementById('student-fields');
      const companyFields = document.getElementById('company-fields');
      if (studentFields) studentFields.style.display = role === 'student' ? 'block' : 'none';
      if (companyFields) companyFields.style.display = role === 'company' ? 'block' : 'none';
    });
  }
}); // preserves existing conditional UI [attached_file:195][attached_file:194]

// ----------------- Helpers -----------------
window.showLoading = (show) => {
  const loading = document.getElementById('loading');
  if (loading) loading.classList.toggle('hidden', !show);
}; // used by index.html flows [attached_file:195][attached_file:194]

function toast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) return alert(msg);
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2200);
} // safe toast used in all pages [attached_file:195][attached_file:194]

// ----------------- Auth: Sign-in / Sign-up / OTP -----------------
window.handleSignIn = async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email')?.value?.trim().toLowerCase();
  const password = document.getElementById('login-password')?.value;
  if (!email || !password) { toast('Email and password are required', 'danger'); return; }
  showLoading(true);
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error; // password login with session on success [web:163]
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile, error: pErr } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('auth_user_id', user.id)
      .single();
    if (pErr || !profile) throw new Error('Profile missing');
    redirectToDashboard(profile.role);
  } catch (err) {
    toast('Sign in failed: ' + (err.message || err), 'danger');
  } finally {
    showLoading(false);
  }
}; // keeps your original sign-in signature and flow [attached_file:194][web:163]

window.handleOtpSignIn = async (e) => {
  e.preventDefault();
  const email = document.getElementById('otp-email')?.value?.trim().toLowerCase();
  if (!email) return toast('Enter email for OTP', 'danger');
  showLoading(true);
  try {
    // Use your existing redirect URL from current file if needed
    const redirectTo = location.origin + location.pathname;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });
    if (error) throw error;
    toast('Check your email for the sign-in link', 'info');
    showLogin();
  } catch (err) {
    toast('OTP sign-in failed: ' + (err.message || err), 'danger');
  } finally {
    showLoading(false);
  }
}; // preserves OTP handler present in your file [attached_file:194]

// Sign up flow (kept from your file, trimmed, core only)
window.handleSignUp = async (e) => {
  e.preventDefault();
  const name = document.getElementById('signup-name')?.value?.trim();
  const email = document.getElementById('signup-email')?.value?.trim().toLowerCase();
  const password = document.getElementById('signup-password')?.value;
  const role = document.getElementById('signup-role')?.value;
  showLoading(true);
  try {
    // Prevent duplicate user_profiles (your existing check)
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (existingProfile) throw new Error('An account with this email already exists. Please sign in.');

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: location.origin + location.pathname }
    });
    if (signUpError) throw signUpError;

    // Fetch current auth user if already confirmed; otherwise ask to log in
    let { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast('Account created. Please sign in.', 'info'); showLogin(); return; }

    // Create profile
    const { error: profileErr } = await supabase.from('user_profiles').insert({
      auth_user_id: user.id,
      email,
      role,
      full_name: name
    });
    if (profileErr) throw profileErr;

    // Student extras
    if (role === 'student') {
      const branch = document.getElementById('signup-branch')?.value?.trim();
      const passing_year = parseInt(document.getElementById('signup-year')?.value);
      const cgpa = parseFloat(document.getElementById('signup-cgpa')?.value);
      if (!branch || !passing_year || Number.isNaN(cgpa)) throw new Error('Please fill all student fields');
      const { data: profile } = await supabase
        .from('user_profiles').select('id').eq('auth_user_id', user.id).single();
      const { error: stuErr } = await supabase.from('students').insert({
        user_id: profile.id, branch, passing_year, cgpa, profile_complete: 60
      });
      if (stuErr) throw stuErr;
    }

    // Company extras (optional minimal keep)
    if (role === 'company') {
      const companyName = document.getElementById('signup-company')?.value?.trim();
      const industry = document.getElementById('signup-industry')?.value?.trim();
      if (!companyName) throw new Error('Please fill all company fields');
      // Ensure or create company
      let { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('name', companyName)
        .maybeSingle();
      if (!company) {
        const { data: newCompany, error: cInsErr } = await supabase
          .from('companies')
          .insert({ name: companyName, industry, status: 'approved' })
          .select('id').single();
        if (cInsErr) throw cInsErr;
        company = newCompany;
      }
      // Link user to company
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      const { error: linkErr } = await supabase
        .from('company_users')
        .insert({ user_id: profile.id, company_id: company.id, title: 'HR Manager' });
      if (linkErr && linkErr.code !== '23505') throw linkErr;
    }

    toast('Account created. Please sign in.', 'success');
    showLogin();
  } catch (err) {
    toast('Sign up failed: ' + (err.message || err), 'danger');
  } finally {
    showLoading(false);
  }
}; // preserves your sign-up pattern but removes unrelated demo code [attached_file:194]

// ----------------- Redirect by role -----------------
window.redirectToDashboard = (role) => {
  switch (role) {
    case 'student': window.location.href = 'dashboard-student.html'; break;
    case 'company': window.location.href = 'dashboard-company.html'; break;
    default: window.location.href = 'index.html';
  }
}; // uses your role routing and points company to company_app.html [attached_file:194]

// ----------------- Logout (new) -----------------
window.setupLogout = ({ buttonId = 'logout-btn', redirectTo = 'index.html' } = {}) => {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.addEventListener('click', async () => {
    try { await supabase.auth.signOut(); } catch (_) {}
    location.href = redirectTo;
  });
}; // proper Supabase sign-out then redirect [web:138]

// Auto-bind logout if button exists
document.addEventListener('DOMContentLoaded', () => {
  window.setupLogout({});
});
