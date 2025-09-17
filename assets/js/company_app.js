// assets/js/student.js
document.addEventListener('DOMContentLoaded', async () => {
  if (!window.supabase) {
    console.error('Supabase client missing. Load supabase-config.js first.')
    return
  }

  const toast = (msg, type = 'info') => {
    const t = document.getElementById('toast')
    if (!t) return alert(msg)
    t.textContent = msg
    t.className = `toast ${type}`
    t.classList.remove('hidden')
    setTimeout(() => t.classList.add('hidden'), 2500)
  }

  // Auth + company guard
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    location.href = 'index.html'
    return
  }

  const { data: profile, error: pErr } = await supabase
    .from('user_profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (pErr || !profile || profile.role !== 'company') {
    toast('Company account required', 'danger')
    location.href = 'index.html'
    return
  }

  const { data: link, error: linkErr } = await supabase
    .from('company_users')
    .select('company_id')
    .eq('user_id', profile.id)
    .single()

  if (linkErr || !link) {
    toast('No company linked to this user', 'danger')
    return
  }
  const companyId = link.company_id

  // Read query params
  const params = new URLSearchParams(location.search)
  const studentId = params.get('sid')
  const jobId = params.get('job')

  if (!studentId || !jobId) {
    toast('Missing student or job id', 'danger')
    return
  }

  // Load job meta for header
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id, title, company_id')
    .eq('id', jobId)
    .eq('company_id', companyId) // ensure it belongs to this company
    .single()

  if (jobErr || !job) {
    toast('Job not found for this company', 'danger')
    return
  }
  document.getElementById('job-title').textContent = job.title || '—'

  // Load student with nested user profile
  const { data: student, error: sErr } = await supabase
    .from('students')
    .select(`
      id, branch, passing_year, cgpa, skills, resume_url,
      user_profiles(full_name, email)
    `)
    .eq('id', studentId)
    .single()

  if (sErr || !student) {
    toast('Failed to load student profile', 'danger')
    return
  }

  // Render profile
  const up = student.user_profiles || {}
  document.getElementById('sp-fullname').textContent = up.full_name || '—'
  document.getElementById('sp-email').textContent = up.email || '—'
  document.getElementById('sp-branch').textContent = student.branch || '—'
  document.getElementById('sp-year').textContent = student.passing_year ?? '—'
  document.getElementById('sp-cgpa').textContent = student.cgpa ?? '—'
  document.getElementById('sp-skills').textContent = (student.skills || []).join(', ') || '—'
  const a = document.getElementById('sp-resume')
  a.href = student.resume_url || '#'
  a.textContent = student.resume_url ? 'Open' : 'No Resume'

  // Helper: find or create application
  async function getOrCreateApplication() {
    const { data: app, error: appErr } = await supabase
      .from('applications')
      .select('id, status')
      .eq('student_id', studentId)
      .eq('job_id', jobId)
      .maybeSingle()

    if (appErr) return { app: null, error: appErr }

    if (app?.id) return { app, error: null }

    const { data: inserted, error: insErr } = await supabase
      .from('applications')
      .insert({
        student_id: studentId,
        job_id: jobId,
        status: 'shortlisted'
      })
      .select('id, status')
      .single()

    if (insErr) return { app: null, error: insErr }
    return { app: inserted, error: null }
  }

  // Save status
  const statusSel = document.getElementById('app-status')
  document.getElementById('btn-save-status')?.addEventListener('click', async () => {
    const targetStatus = statusSel?.value || 'shortlisted'
    const { app, error } = await getOrCreateApplication()
    if (error || !app) {
      toast('Failed to create/find application', 'danger')
      return
    }
    const { error: upErr } = await supabase
      .from('applications')
      .update({ status: targetStatus })
      .eq('id', app.id)

    if (upErr) return toast('Failed to update status', 'danger')
    toast('Status updated', 'success')
  })

  // Schedule interview
  const ivDate = document.getElementById('iv-date')
  const ivTime = document.getElementById('iv-time')
  const ivMode = document.getElementById('iv-mode')
  const ivInterviewer = document.getElementById('iv-interviewer')

  document.getElementById('btn-schedule')?.addEventListener('click', async () => {
    if (!ivDate?.value || !ivTime?.value) {
      toast('Pick date and time', 'danger')
      return
    }

    const { app, error } = await getOrCreateApplication()
    if (error || !app) {
      toast('Failed to create/find application', 'danger')
      return
    }

    const payload = {
      application_id: app.id,
      company_id: companyId,
      scheduled_date: ivDate.value,   // YYYY-MM-DD
      scheduled_time: ivTime.value,   // HH:MM
      mode: ivMode?.value || 'Online',
      status: 'scheduled',
      interviewer: ivInterviewer?.value?.trim() || null
    }

    const { error: ivErr } = await supabase
      .from('interviews')
      .insert(payload)

    if (ivErr) return toast('Failed to create interview', 'danger')
    toast('Interview scheduled', 'success')
  })
})
