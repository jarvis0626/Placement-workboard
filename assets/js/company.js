// company.js — classic script (no imports). Relies on window.supabase from supabase-config.js.

document.addEventListener('DOMContentLoaded', async () => {
  // Guard: supabase client present
  if (!window.supabase) {
    console.error('Supabase client not found on window. Load supabase-config.js first.');
    return;
  }

  // Small toast helper
  const toast = (msg, type = 'info') => {
    const t = document.getElementById('toast');
    if (!t) return alert(msg);
    t.textContent = msg;
    t.className = `toast ${type}`;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 2500);
  };

  // Elements (IDs exactly as in your HTML)
  const form = document.getElementById('company-form');
  const nameInput = document.getElementById('company-name');
  const industryInput = document.getElementById('company-industry');
  const websiteInput = document.getElementById('company-website');
  const statusSelect = document.getElementById('company-status'); // optional (may not exist)

  const editBtn = document.getElementById('edit-company-btn');
  const saveBtn = document.getElementById('save-company-btn');
  const cancelBtn = document.getElementById('cancel-company-btn');

  const nameDisplay = document.getElementById('company-name-display');
  const industryDisplay = document.getElementById('company-industry-display');

  const jobFilter = document.getElementById('job-filter');
  const searchInput = document.getElementById('search-students');
  const studentsTbody = document.querySelector('#students-table tbody');

  // Drawer IDs in your HTML
  const drawer = document.getElementById('student-drawer');
  const drawerClose = document.getElementById('drawer-close');
  const approveBtn = document.getElementById('approve-btn');
  const rejectBtn = document.getElementById('reject-btn');

  // Optional stat counters
  const interestedCountEl = document.getElementById('interested-students');
  const shortlistedCountEl = document.getElementById('shortlisted-students');
  const selectedCountEl = document.getElementById('selected-students');

  // Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    location.href = 'index.html';
    return;
  }

  // Resolve profile (must be company)
  const { data: profile, error: pErr } = await supabase
    .from('user_profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single();

  if (pErr || !profile || profile.role !== 'company') {
    toast('Company account required', 'danger');
    location.href = 'index.html';
    return;
  }

  // Map to company via company_users
  const { data: link, error: linkErr } = await supabase
    .from('company_users')
    .select('company_id')
    .eq('user_id', profile.id)
    .single();

  if (linkErr || !link) {
    toast('No company linked to this user', 'danger');
    return;
  }
  const companyId = link.company_id;

  // ===== Jobs: form elements & helpers =====
  const jobForm         = document.getElementById('job-form')           // <form>
  const jobTitle        = document.getElementById('job-title')          // <input>
  const jobDesc         = document.getElementById('job-description')    // <textarea>
  const jobType         = document.getElementById('job-type')           // <select>
  const jobLocation     = document.getElementById('job-location')       // <input>
  const jobCTC          = document.getElementById('job-ctc')            // <input>
  const jobDeadline     = document.getElementById('job-deadline')       // <input type="date">
  const jobReqs         = document.getElementById('job-requirements')   // <input comma-separated>
  const jobBranches     = document.getElementById('job-branches')       // <input comma-separated>

  function splitCsv(el) {
  const v = (el?.value || '').trim()
  if (!v) return []
  return v.split(',').map(s => s.trim()).filter(Boolean)
  }

  async function createJob(e) {
  e.preventDefault()
  // minimal validation
  if (!jobTitle?.value?.trim()) return toast('Job title is required', 'danger')

  const payload = {
    title: jobTitle.value.trim(),
    description: jobDesc?.value?.trim() || null,
    type: jobType?.value || null,
    location: jobLocation?.value?.trim() || null,
    ctc: jobCTC?.value?.trim() || null,
    deadline: jobDeadline?.value ? new Date(jobDeadline.value).toISOString() : null,
    requirements: splitCsv(jobReqs),
    eligible_branches: splitCsv(jobBranches),
    company_id: companyId
  }

  const { data, error } = await supabase.from('jobs').insert(payload).select('id')
  if (error) {
    console.error('Create job error:', error)
    toast(error.message || 'Failed to create job', 'danger')
    return
  }
  toast('Job created', 'success')
  jobForm?.reset()
  await loadJobs()
}


  // Helpers
  function setEditable(edit) {
    [nameInput, industryInput, websiteInput].forEach(el => { if (el) el.disabled = !edit; });
    if (statusSelect) statusSelect.disabled = !edit;
    if (saveBtn) saveBtn.disabled = !edit;
    if (cancelBtn) cancelBtn.disabled = !edit;
    if (editBtn) editBtn.disabled = edit;
  }

  async function loadCompany() {
    const { data: comp, error } = await supabase
      .from('companies')
      .select('id, name, industry, website, status')
      .eq('id', companyId)
      .single();

    if (error || !comp) {
      toast('Failed to load company', 'danger');
      return;
    }

    // Fill form fields
    if (nameInput) nameInput.value = comp.name || '';
    if (industryInput) industryInput.value = comp.industry || '';
    if (websiteInput) websiteInput.value = comp.website || '';
    if (statusSelect) statusSelect.value = comp.status || 'approved';

    // Header display
    if (nameDisplay) nameDisplay.textContent = comp.name || 'Company Profile';
    if (industryDisplay) industryDisplay.textContent = comp.industry || '';

    setEditable(false);
  }

  async function loadJobs() {
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, title')
      .eq('company_id', companyId)
      .order('title');

    if (jobFilter) {
      jobFilter.innerHTML = '<option value="">All Jobs</option>';
      if (!error && jobs) {
        jobs.forEach(j => {
          const opt = document.createElement('option');
          opt.value = j.id;
          opt.textContent = j.title;
          jobFilter.appendChild(opt);
        });
      }
    }
  }

  async function fetchInterested(jobId = null, search = '') {
  let query = supabase
    .from('job_interest')
    .select(`
      id,
      job_id,
      jobs!inner(id, title, company_id),
      students!inner(
        id, branch, passing_year, cgpa, user_id,
        user_profiles!inner(id, full_name, email)
      )
    `)
    .eq('jobs.company_id', companyId)

  if (jobId) query = query.eq('job_id', jobId)

  const { data: interests, error } = await query
  if (error) {
    toast('Error loading interested students.', 'danger')
    return []
  }

  if (!search) return interests

  const lowered = search.trim().toLowerCase()
  return interests.filter(item => {
    const up = item.students?.user_profiles || {}
    const name = up.full_name?.toLowerCase() || ''
    const email = up.email?.toLowerCase() || ''
    const branch = item.students?.branch?.toLowerCase() || ''
    return name.includes(lowered) || email.includes(lowered) || branch.includes(lowered)
  })
}


  async function renderTable() {
  const jobId = jobFilter?.value || null
  const q = searchInput?.value || ''
  const rows = await fetchInterested(jobId, q)

  // reset table body
  if (!studentsTbody) return
  studentsTbody.innerHTML = ''

  if (!rows.length) {
    studentsTbody.innerHTML = '<tr class="empty-state"><td colspan="7">No interested students found.</td></tr>'
  } else {
    rows.forEach(item => {
      const up = item.students?.user_profiles || {}
      const tr = document.createElement('tr')
      // Inside renderTable(), replace the Action cell:
      tr.innerHTML = `
        <td>${up.full_name || '—'}</td>
        <td>${up.email || '—'}</td>
        <td>${item.students?.branch || '—'}</td>
        <td>${item.students?.passing_year || '—'}</td>
        <td>${item.students?.cgpa ?? '—'}</td>
        <td>${item.jobs.title}</td>
        <td>
          <a class="btn small" href="company_app.html?sid=${item.students.id}&job=${item.job_id}">View</a>
        </td>
      `

      studentsTbody.appendChild(tr)
    })
  } 

  if (interestedCountEl) interestedCountEl.textContent = String(rows.length || 0)
}


  // Drawer controls
  function openDrawer() { if (drawer) drawer.classList.remove('hidden'); }
  function closeDrawer() { if (drawer) drawer.classList.add('hidden'); }
  drawerClose?.addEventListener('click', closeDrawer);

  async function loadStudentProfile(studentId) {
    const { data, error } = await supabase
      .from('students')
      .select(`
        id, branch, passing_year, cgpa, skills, resume_url,
        user_profiles!inner(full_name, email)
      `)
      .eq('id', studentId)
      .single();

    if (error || !data) {
      toast('Failed to load profile', 'danger');
      return null;
    }

    document.getElementById('drawer-title').textContent = data.user_profiles.full_name || 'Student Profile';
    document.getElementById('sp-fullname').textContent = data.user_profiles.full_name || '—';
    document.getElementById('sp-email').textContent = data.user_profiles.email || '—';
    document.getElementById('sp-branch').textContent = data.branch || '—';
    document.getElementById('sp-year').textContent = data.passing_year || '—';
    document.getElementById('sp-cgpa').textContent = data.cgpa ?? '—';
    document.getElementById('sp-skills').textContent = (data.skills || []).join(', ') || '—';
    const a = document.getElementById('sp-resume');
    a.href = data.resume_url || '#';
    a.textContent = data.resume_url ? 'Open' : 'No Resume';
    return data;
  }

  let currentStudentId = null;
  let currentJobId = null;

  studentsTbody?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-view]');
    if (!btn) return;
    currentStudentId = btn.getAttribute('data-view');
    currentJobId = btn.getAttribute('data-job');
    await loadStudentProfile(currentStudentId);
    openDrawer();
  });

  approveBtn?.addEventListener('click', async () => {
    if (!currentStudentId || !currentJobId) return;

    const { data: app } = await supabase
      .from('applications')
      .select('id')
      .eq('student_id', currentStudentId)
      .eq('job_id', currentJobId)
      .maybeSingle();

    if (app?.id) {
      const { error } = await supabase
        .from('applications')
        .update({ status: 'shortlisted' })
        .eq('id', app.id);
      if (error) return toast('Failed to approve', 'danger');
    } else {
      const { error } = await supabase
        .from('interviews')
        .insert({
          application_id: null,
          company_id: companyId,
          job_id: currentJobId,
          student_id: currentStudentId,
          scheduled_date: null,
          scheduled_time: '',
          mode: 'Online',
          status: 'scheduled'
        });
      if (error) return toast('Failed to create interview', 'danger');
    }
    toast('Approved for interview', 'success');
    closeDrawer();
    renderTable();
  });

  rejectBtn?.addEventListener('click', async () => {
    if (!currentStudentId || !currentJobId) return;

    const { data: app } = await supabase
      .from('applications')
      .select('id')
      .eq('student_id', currentStudentId)
      .eq('job_id', currentJobId)
      .maybeSingle();

    if (app?.id) {
      const { error } = await supabase
        .from('applications')
        .update({ status: 'rejected' })
        .eq('id', app.id);
      if (error) return toast('Failed to reject', 'danger');
    }
    toast('Rejected', 'success');
    closeDrawer();
    renderTable();
  });

  // Buttons
  editBtn?.addEventListener('click', () => setEditable(true));
  cancelBtn?.addEventListener('click', async () => { await loadCompany(); setEditable(false); });
  jobForm?.addEventListener('submit', createJob)


  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const update = {
      name: nameInput?.value.trim() || '',
      industry: industryInput?.value.trim() || '',
      website: websiteInput?.value.trim() || ''
    };
    if (statusSelect) update.status = statusSelect.value;

    const { error } = await supabase.from('companies').update(update).eq('id', companyId);
    if (error) { toast('Save failed', 'danger'); return; }
    toast('Profile saved', 'success');
    await loadCompany();
  });

  // Filters
  jobFilter?.addEventListener('change', renderTable);
  searchInput?.addEventListener('input', renderTable);

  // Init
  await loadCompany();
  await loadJobs();
  await renderTable();
}); 
