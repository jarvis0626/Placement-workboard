// assets/js/profile.js
document.addEventListener('DOMContentLoaded', async () => {
  if (!window.supabase) { alert('Supabase not initialized'); return }
  const toast = (m, t='info') => alert(`${t.toUpperCase()}: ${m}`)

  // Elements
  const form = document.getElementById('student-profile-form')
  const nameEl = document.getElementById('profile-name')
  const emailEl = document.getElementById('profile-email')
  const phoneEl = document.getElementById('profile-phone')
  const branchEl = document.getElementById('profile-branch')
  const yearEl = document.getElementById('profile-year')
  const cgpaEl = document.getElementById('profile-cgpa')
  const skillsEl = document.getElementById('profile-skills')
  const resumeEl = document.getElementById('profile-resume')
  const cancelBtn = document.getElementById('profile-cancel')

  // Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { window.location.href = 'index.html'; return }

  // Fetch profile
  const { data: profile, error: pErr } = await supabase
    .from('user_profiles')
    .select('id, full_name, email, role')
    .eq('auth_user_id', user.id)
    .single()
  if (pErr || !profile || profile.role !== 'student') {
    toast('Student profile required', 'danger'); window.location.href = 'index.html'; return
  }

  // Fetch or create student row
  let { data: student, error: sErr } = await supabase
    .from('students')
    .select('id, phone, branch, passing_year, cgpa, skills, resume_url')
    .eq('user_id', profile.id)
    .maybeSingle()
  if (!student) {
    const { data: ins, error: iErr } = await supabase
      .from('students')
      .insert({ user_id: profile.id, profile_complete: 0 })
      .select('id, phone, branch, passing_year, cgpa, skills, resume_url')
      .single()
    if (iErr) { toast('Could not create student row', 'danger'); return }
    student = ins
  }

  // Populate form
  nameEl.value = profile.full_name || ''
  emailEl.value = profile.email || user.email || ''
  phoneEl.value = student?.phone || ''
  branchEl.value = student?.branch || ''
  yearEl.value = student?.passing_year || ''
  cgpaEl.value = student?.cgpa ?? ''
  skillsEl.value = (student?.skills || []).join(', ')
  resumeEl.value = student?.resume_url || ''

  function computeCompletion({ phone, cgpa, skills }) {
    const req = [
      Boolean(phone && phone.trim()),
      typeof cgpa === 'number' && !Number.isNaN(cgpa),
      Array.isArray(skills) && skills.length > 0
    ]
    return Math.round(req.filter(Boolean).length / req.length * 100)
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    try {
      // Collect values
      const full_name = nameEl.value.trim()
      const phone = phoneEl.value.trim()
      const branch = branchEl.value.trim()
      const passing_year = parseInt(yearEl.value, 10) || null
      const cgpa = cgpaEl.value === '' ? null : parseFloat(cgpaEl.value)
      const skills = skillsEl.value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      const resume_url = resumeEl.value.trim() || null

      // Basic client validation
      if (!full_name) return toast('Name is required', 'danger')
      if (cgpa !== null && (cgpa < 0 || cgpa > 10)) return toast('CGPA must be 0–10', 'danger')

      // Update name in user_profiles (email stays authoritative from auth)
      const { error: upErr } = await supabase
        .from('user_profiles')
        .update({ full_name })
        .eq('id', profile.id)
      if (upErr) throw upErr

      // Update students
      const completion = computeCompletion({ phone, cgpa, skills })
      const { error: stuErr } = await supabase
        .from('students')
        .update({
          phone,
          branch,
          passing_year,
          cgpa,
          skills,
          resume_url,
          profile_complete: completion
        })
        .eq('id', student.id)
      if (stuErr) throw stuErr

      toast('Profile updated', 'success')
      window.location.href = 'dashboard-student.html'
    } catch (err) {
      console.error(err)
      toast('Failed to save profile', 'danger')
    }
  })

  cancelBtn?.addEventListener('click', () => (window.location.href = 'dashboard-student.html'))
})
