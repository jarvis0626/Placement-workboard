// assets/js/jobs.js
// Uses window.supabase (ensure supabase-config.js is loaded first)

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.supabase) { alert('Supabase not initialized'); return }

  const toast = (msg, type='info') => {
    const t = document.getElementById('toast')
    if (!t) return alert(msg)
    t.textContent = msg
    t.className = `toast ${type}`
    t.classList.remove('hidden')
    setTimeout(() => t.classList.add('hidden'), 2200)
  }

  // Elements
  const listEl = document.getElementById('jobs-list')
  const emptyEl = document.getElementById('jobs-empty')
  const searchEl = document.getElementById('search-jobs')
  const companySel = document.getElementById('filter-company')
  const branchSel = document.getElementById('filter-branch')
  const typeSel = document.getElementById('filter-type')

  // Current user and student profile
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { window.location.href = 'index.html'; return }

  const { data: profile, error: pErr } = await supabase
    .from('user_profiles')
    .select('id, role, full_name, email')
    .eq('auth_user_id', user.id)
    .single()
  if (pErr || !profile || profile.role !== 'student') {
    toast('Student account required', 'danger')
    window.location.href = 'index.html'
    return
  }

  // Helpers
  function normalize(str){ return (str || '').toString().toLowerCase() }

  // Load filter data
  async function loadFilters() {
    // Companies
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name')
      .order('name')
    if (companySel) {
      companySel.innerHTML = '<option value="">All companies</option>'
      ;(companies || []).forEach(c => {
        const opt = document.createElement('option')
        opt.value = c.id
        opt.textContent = c.name
        companySel.appendChild(opt)
      })
    }
    // Branches from jobs.eligible_branches (if you store as array), else leave blank
    const { data: branches } = await supabase
      .from('jobs')
      .select('eligible_branches')
      .not('eligible_branches', 'is', null)
      .limit(2000)
    const set = new Set()
    ;(branches || []).forEach(r => (r.eligible_branches || []).forEach(b => set.add(b)))
    if (branchSel) {
      branchSel.innerHTML = '<option value="">All branches</option>'
      Array.from(set).sort().forEach(b => {
        const opt = document.createElement('option')
        opt.value = b
        opt.textContent = b
        branchSel.appendChild(opt)
      })
    }
  }

  // Fetch jobs (with company name)
  async function fetchJobs() {
    // Adjust fields based on your table
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        description,
        requirements,
        ctc,
        location,
        type,
        deadline,
        eligible_branches,
        company_id,
        companies!inner(name)
      `)
      .order('created_at', { ascending: false })
    if (error) {
      toast('Failed to load jobs', 'danger')
      return []
    }
    return data || []
  }

  // Check if current student already marked interest
  async function getMyInterests() {
    const { data, error } = await supabase
      .from('job_interest')
      .select('job_id')
      .eq('student_profile_id', profile.id)
    if (error) return new Set()
    return new Set((data || []).map(r => r.job_id))
  }

  // Render list
  let allJobs = []
  let myInterests = new Set()

  function passFilters(job) {
    const q = normalize(searchEl?.value)
    const compOk = !companySel?.value || job.company_id === companySel.value
    const branchOk = !branchSel?.value || (Array.isArray(job.eligible_branches) && job.eligible_branches.includes(branchSel.value))
    const typeOk = !typeSel?.value || job.type === typeSel.value

    const text = `${job.title} ${job.description || ''} ${job.companies?.name || ''} ${(job.requirements || []).join(' ')}`.toLowerCase()
    const qOk = !q || text.includes(q)

    return compOk && branchOk && typeOk && qOk
  }

  function jobCard(job) {
    const reqs = Array.isArray(job.requirements) ? job.requirements : []
    const interested = myInterests.has(job.id)

    const card = document.createElement('div')
    card.className = 'job-card'
    card.innerHTML = `
      <h4 class="job-title">${job.title}</h4>
      <div class="job-meta">
        <span class="chip">${job.companies?.name || 'Company'}</span>
        <span class="chip">${job.type || 'Role'}</span>
        <span class="chip">${job.location || 'Location'}</span>
        ${job.ctc ? `<span class="chip">CTC: ${job.ctc}</span>` : ''}
        ${job.deadline ? `<span class="chip">Deadline: ${new Date(job.deadline).toLocaleDateString()}</span>` : ''}
      </div>
      <div class="job-desc">${job.description || ''}</div>
      ${reqs.length ? `<div class="job-meta">Req: ${reqs.map(r => `<span class="chip">${r}</span>`).join(' ')}</div>` : ''}
      <div class="job-footer">
        <div></div>
        <button class="btn ${interested ? '' : 'btn--primary'}" data-interest="${job.id}" ${interested ? 'disabled' : ''}>
          ${interested ? 'Interested ✓' : "I'm Interested"}
        </button>
      </div>
    `
    return card
  }

  function render() {
    if (!listEl) return
    listEl.innerHTML = ''
    const filtered = allJobs.filter(passFilters)
    if (!filtered.length) {
      const es = document.createElement('div')
      es.className = 'empty-state'
      es.textContent = 'No jobs found.'
      listEl.appendChild(es)
      return
    }
    filtered.forEach(j => listEl.appendChild(jobCard(j)))
  }

  // Interest handler
    listEl?.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-interest]')
      if (!btn) return
      const jobId = btn.getAttribute('data-interest')
      btn.disabled = true

      try {
        if (myInterests.has(jobId)) {
          btn.textContent = 'Interested ✓'
          btn.classList.remove('btn--primary')
          return
        }

        // INSERT THE STUDENT LOOKUP HERE
        // After fetching profile (user_profiles.id is profile.id)
        const { data: studentRow, error: sErr } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', profile.id)   // students.user_id -> user_profiles.id
          .single()

        if (sErr || !studentRow) {
          console.error('student lookup error', sErr)
          btn.disabled = false
          toast('Complete student profile before marking interest', 'danger')
          return
        }

        // Then use studentRow.id in the insert
        const { data, error } = await supabase
          .from('job_interest')
          .insert({ job_id: jobId, student_id: studentRow.id }) // use students.id here
          .select('id')
          .single()

        if (error && error.code !== '23505') {
          console.error('interest insert error', error)
          btn.disabled = false
          toast('Failed to mark interest', 'danger')
          return
        }

        myInterests.add(jobId)
        btn.textContent = 'Interested ✓'
        btn.classList.remove('btn--primary')
        toast('Marked as interested', 'success')
      } catch (err) {
        console.error('interest handler exception', err)
        btn.disabled = false
        toast('Failed to mark interest', 'danger')
      }
    })




  // Filters
  searchEl?.addEventListener('input', render)
  companySel?.addEventListener('change', render)
  branchSel?.addEventListener('change', render)
  typeSel?.addEventListener('change', render)

  // Init
  await loadFilters()
  allJobs = await fetchJobs()
  myInterests = await getMyInterests()
  render()
})
