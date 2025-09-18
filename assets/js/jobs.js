// assets/js/jobs.js
// Uses window.supabase; ensure assets/js/supabase-config.js is loaded first.

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.supabase) { alert('Supabase not initialized'); return; }

  // CONFIG: set to true to remove the job card after applying, false to grey it out
  const HIDE_APPLIED = true;

  // Toast
  const toast = (msg, type='info') => {
    const t = document.getElementById('toast');
    if (!t) return alert(msg);
    t.textContent = msg;
    t.className = `toast ${type}`;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 2200);
  };

  // Elements (IDs already used on your page)
  const listEl     = document.getElementById('jobs-list');
  const emptyEl    = document.getElementById('jobs-empty');
  const searchEl   = document.getElementById('search-jobs');
  const companySel = document.getElementById('filter-company');
  const branchSel  = document.getElementById('filter-branch');
  const typeSel    = document.getElementById('filter-type');

  // Auth and profile
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { window.location.href = 'index.html'; return; }

  const { data: profile, error: pErr } = await supabase
    .from('user_profiles')
    .select('id, role, full_name, email')
    .eq('auth_user_id', user.id)
    .single();
  if (pErr || !profile || profile.role !== 'student') {
    toast('Student account required', 'danger');
    window.location.href = 'index.html';
    return;
  }

  // Student row to get student_id for applications
  const { data: student, error: sErr } = await supabase
    .from('students')
    .select('id, branch, cgpa')
    .eq('user_id', profile.id)
    .single();
  if (sErr || !student?.id) {
    toast('Student record not found', 'danger');
    return;
  }
  const studentId = student.id;
  const studentBranch = student.branch || '';
  const studentCgpa   = Number(student.cgpa || 0);

  // Data state
  let allJobs = [];
  let appliedJobIds = new Set();

  // Helpers
  const normalize = (s) => (s || '').toString().toLowerCase();

  async function loadFilters() {
    // Companies dropdown
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name')
      .order('name');
    if (companySel) {
      companySel.innerHTML = '<option value="">All companies</option>';
      (companies || []).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        companySel.appendChild(opt);
      });
      companySel.selectedIndex = 0;
    }


    // Branches from jobs.eligible_branches (array)
    const { data: branches } = await supabase
      .from('jobs')
      .select('eligible_branches')
      .not('eligible_branches', 'is', null)
      .limit(2000);
    const set = new Set();
    (branches || []).forEach(r => (r.eligible_branches || []).forEach(b => set.add(b)));
    if (branchSel) {
      branchSel.innerHTML = '<option value="">All branches</option>';
      Array.from(set).sort().forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        branchSel.appendChild(opt);
      });
  branchSel.selectedIndex = 0;
}

  }

  async function fetchJobs() {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        id, title, description, requirements, ctc, location, type, deadline,
        eligible_branches, min_cgpa, company_id,
        companies(name)
      `)
      .order('created_at', { ascending: false });
    if (error) {
      toast('Failed to load jobs', 'danger');
      return [];
    }
    return data || [];
  }

  // Fetch applications once and derive applied job ids
  async function fetchAppliedJobIds() {
    const { data, error } = await supabase
      .from('applications')
      .select('job_id')
      .eq('student_id', studentId);
    if (error) return new Set();
    return new Set((data || []).map(r => r.job_id));
  }

  function passFilters(job) {
    const q = normalize(searchEl?.value);
    const compOk   = !companySel?.value || job.company_id === companySel.value;
    const branchOk = !branchSel?.value || (Array.isArray(job.eligible_branches) && job.eligible_branches.includes(branchSel.value));
    const typeOk   = !typeSel?.value   || job.type === typeSel.value;

    // Text search over title, description, company and requirements
    const text = `${job.title} ${job.description || ''} ${job.companies?.name || ''} ${(job.requirements || []).join(' ')}`.toLowerCase();
    const qOk = !q || text.includes(q);

    // Eligibility gate (optional; keep lenient)
    const cgpaOk = (Number(job.min_cgpa || 0) <= studentCgpa);
    return compOk && branchOk && typeOk && qOk && cgpaOk;
  }

  function jobCard(job) {
    const applied = appliedJobIds.has(job.id);
    const reqs = Array.isArray(job.requirements) ? job.requirements : [];

    const card = document.createElement('div');
    card.className = `job-card${applied ? ' applied' : ''}`;
    card.dataset.jobId = job.id;
    card.innerHTML = `
      <div class="job-card__header">
        <h4 class="job-title">${job.title || 'Job'} <span class="company-name">${job.companies?.name ? ' • ' + job.companies.name : ''}</span></h4>
        <div class="job-meta">
          ${job.location ? `<span class="job-location">${job.location}</span>` : ''}
          ${job.ctc ? `<span class="job-ctc">${job.ctc}</span>` : ''}
          ${job.deadline ? `<span class="job-deadline">Due ${new Date(job.deadline).toLocaleDateString()}</span>` : ''}
        </div>
      </div>
      <div class="job-card__body">
        ${job.description ? `<p class="job-desc">${job.description}</p>` : ''}
        ${reqs.length ? `<div class="job-reqs">${reqs.map(r=>`<span class="chip">${r}</span>`).join('')}</div>` : ''}
      </div>
      <div class="job-card__actions">
          <button class="btn btn--interest apply-btn" ${applied ? 'disabled' : ''}>
            ${applied ? 'Applied' : 'Apply'}
          </button>
      </div>
    `;

    return card;
  }


    // ignore unique violations if already present


  function renderList() {
    if (!listEl) return;
    listEl.innerHTML = '';

    // Filter applied out or leave and grey out
    let jobs = allJobs.filter(passFilters);
    if (HIDE_APPLIED) {
      jobs = jobs.filter(j => !appliedJobIds.has(j.id));
    }

    if (!jobs.length) {
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    const frag = document.createDocumentFragment();
    jobs.forEach(job => frag.appendChild(jobCard(job)));
    listEl.appendChild(frag);
  }

  // Apply handler
  async function handleApply(jobId, cardEl) {
    try {
      // skip if already applied
      if (appliedJobIds.has(jobId)) return;

      const { data, error } = await supabase
        .from('applications')
        .insert({ student_id: studentId, job_id: jobId, status: 'pending' })
        .select('id')
        .single(); // return the inserted row id
        // AFTER successful applications insert in handleApply(jobId, cardEl)
          try {
            await supabase
              .from('job_interest')
              .insert({ student_id: studentId, job_id: jobId })
              .select('id')
              .single();
          } catch (e) {
            if (!(e && (e.code === '23505' || (e.message || '').includes('duplicate')))) {
              console.warn('job_interest mirror insert failed:', e);
            }
          }

      if (error) { toast('Failed to apply', 'danger'); return; }

      // track applied id locally
      appliedJobIds.add(jobId);

      if (HIDE_APPLIED) {
        // remove card entirely
        cardEl?.remove();
        // show empty state if nothing left
        if (listEl && listEl.children.length === 0 && emptyEl) emptyEl.classList.remove('hidden');
      } else {
        // grey out the card and disable button
        cardEl?.classList.add('applied');
        const btn = cardEl?.querySelector('.apply-btn');
        if (btn) { btn.textContent = 'Applied'; btn.disabled = true; btn.classList.add('applied'); }
      }

      toast('Added to My Applications (Pending)', 'success');
    } catch (e) {
      console.error(e);
      toast('Error applying to job', 'danger');
    }

  }

  // Delegated click for “I’m interested”
  listEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('.apply-btn');
    if (!btn) return;
    const card = btn.closest('.job-card');
    const jobId = card?.dataset?.jobId;
    if (!jobId) return;
    handleApply(jobId, card);
  });

  // Filter/search listeners
  [searchEl, companySel, branchSel, typeSel].forEach(el => {
    el?.addEventListener('input', renderList);
    el?.addEventListener('change', renderList);
  });

  // Initial load
  await loadFilters();
  allJobs = await fetchJobs();
  appliedJobIds = await fetchAppliedJobIds();
  renderList();
});
// assets/js/jobs.js  