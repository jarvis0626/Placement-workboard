
// Jobs page JS for PlacementPro (full logic from jobs-updated.html)
let currentUser = null
let studentData = null
let allJobs = []
let filteredJobs = []
let currentJob = null
let appliedJobs = new Set()
let currentPage = 0
const jobsPerPage = 12

// Initialize page on load
window.addEventListener('DOMContentLoaded', async () => {
    // Require student role
    currentUser = await authUtils.requireRole(['student'])
    if (!currentUser) return

    await loadStudentData()
    await loadJobs()
    await loadAppliedJobs()
    await populateFilters()
})

async function loadStudentData() {
    try {
        const { data: student } = await supabase
            .from('students')
            .select(`
                id, branch, passing_year, cgpa,
                user_profiles(full_name)
            `)
            .eq('user_id', currentUser.profile.id)
            .single()

        studentData = student
        document.getElementById('user-name').textContent = student.user_profiles.full_name

    } catch (error) {
        console.error('Error loading student data:', error)
        alert('Error loading student profile')
    }
}

async function loadJobs() {
    try {
        // Get all eligible jobs for this student
        const { data: eligibleJobs } = await supabase
            .from('v_eligible_jobs')
            .select(`
                job_id,
                jobs(
                    id, title, description, requirements, ctc, location, 
                    job_type, deadline, min_cgpa, eligible_branches,
                    companies(id, name, industry, logo_url)
                )
            `)
            .eq('student_id', studentData.id)

        if (eligibleJobs) {
            allJobs = eligibleJobs.map(item => ({
                id: item.jobs.id,
                ...item.jobs
            }))
            
            filteredJobs = [...allJobs]
            displayJobs()
        } else {
            document.getElementById('jobs-grid').innerHTML = '<div class="empty-state">No eligible jobs found. Update your profile to see more opportunities.</div>'
        }

    } catch (error) {
        console.error('Error loading jobs:', error)
        document.getElementById('jobs-grid').innerHTML = '<div class="error">Error loading jobs. Please try again.</div>'
    }
}

async function loadAppliedJobs() {
    try {
        const { data: applications } = await supabase
            .from('applications')
            .select('job_id')
            .eq('student_id', studentData.id)

        appliedJobs = new Set(applications?.map(app => app.job_id) || [])

    } catch (error) {
        console.error('Error loading applied jobs:', error)
    }
}

function displayJobs() {
    const container = document.getElementById('jobs-grid')
    const startIndex = currentPage * jobsPerPage
    const endIndex = startIndex + jobsPerPage
    const jobsToShow = filteredJobs.slice(0, endIndex)

    if (jobsToShow.length === 0) {
        container.innerHTML = '<div class="empty-state">No jobs match your current filters.</div>'
        document.getElementById('load-more-container').style.display = 'none'
        return
    }

    container.innerHTML = jobsToShow.map(job => `
        <div class="job-card" onclick="showJobDetails(${job.id})">
            <div class="job-header">
                <h3>${job.title}</h3>
                <div class="company-badge">${job.companies.name}</div>
            </div>
            <div class="job-meta">
                <span class="job-location">📍 ${job.location}</span>
                <span class="job-ctc">💰 ${job.ctc}</span>
            </div>
            <div class="job-description">
                <p>${job.description.substring(0, 120)}...</p>
            </div>
            <div class="job-requirements">
                ${job.requirements.slice(0, 3).map(req => `<span class="skill-tag">${req}</span>`).join('')}
                ${job.requirements.length > 3 ? `<span class="more-skills">+${job.requirements.length - 3} more</span>` : ''}
            </div>
            <div class="job-footer">
                <div class="job-deadline">
                    ⏰ Apply by ${new Date(job.deadline).toLocaleDateString()}
                </div>
                <div class="job-status">
                    ${appliedJobs.has(job.id) ? 
                        '<span class="applied-badge">Applied</span>' : 
                        '<span class="eligible-badge">Eligible</span>'
                    }
                </div>
            </div>
        </div>
    `).join('')

    // Show/hide load more button
    const loadMoreContainer = document.getElementById('load-more-container')
    if (endIndex < filteredJobs.length) {
        loadMoreContainer.style.display = 'block'
    } else {
        loadMoreContainer.style.display = 'none'
    }
}

async function populateFilters() {
    // Populate location filter
    const locations = [...new Set(allJobs.map(job => job.location))].sort()
    const locationFilter = document.getElementById('location-filter')
    locationFilter.innerHTML = '<option value="">All Locations</option>' + 
        locations.map(loc => `<option value="${loc}">${loc}</option>`).join('')

    // Populate company filter
    const companies = [...new Set(allJobs.map(job => job.companies.name))].sort()
    const companyFilter = document.getElementById('company-filter')
    companyFilter.innerHTML = '<option value="">All Companies</option>' + 
        companies.map(comp => `<option value="${comp}">${comp}</option>`).join('')
}

window.applyFilters = () => {
    const locationFilter = document.getElementById('location-filter').value
    const companyFilter = document.getElementById('company-filter').value
    const ctcFilter = document.getElementById('ctc-filter').value
    const searchQuery = document.getElementById('search-input').value.toLowerCase()

    filteredJobs = allJobs.filter(job => {
        // Location filter
        if (locationFilter && job.location !== locationFilter) return false
        
        // Company filter
        if (companyFilter && job.companies.name !== companyFilter) return false
        
        // CTC filter
        if (ctcFilter) {
            const ctc = job.ctc.toLowerCase()
            if (ctcFilter === '0-5' && !ctc.includes('0-5') && !ctc.includes('3-5') && !ctc.includes('4-5')) return false
            if (ctcFilter === '5-7' && !ctc.includes('5-7') && !ctc.includes('6-7')) return false
            if (ctcFilter === '7-10' && !ctc.includes('7-9') && !ctc.includes('7-10') && !ctc.includes('8-10')) return false
            if (ctcFilter === '10+' && !ctc.includes('10+') && !ctc.includes('12+') && !ctc.includes('15+')) return false
        }
        
        // Search filter
        if (searchQuery && 
            !job.title.toLowerCase().includes(searchQuery) && 
            !job.companies.name.toLowerCase().includes(searchQuery) &&
            !job.description.toLowerCase().includes(searchQuery)) {
            return false
        }
        
        return true
    })

    currentPage = 0
    displayJobs()
}

window.clearFilters = () => {
    document.getElementById('location-filter').value = ''
    document.getElementById('company-filter').value = ''
    document.getElementById('ctc-filter').value = ''
    document.getElementById('search-input').value = ''
    
    filteredJobs = [...allJobs]
    currentPage = 0
    displayJobs()
}

window.loadMoreJobs = () => {
    currentPage++
    displayJobs()
}

window.showJobDetails = (jobId) => {
    currentJob = allJobs.find(job => job.id === jobId)
    if (!currentJob) return

    // Populate modal with job details
    document.getElementById('modal-job-title').textContent = currentJob.title
    document.getElementById('modal-company-name').textContent = currentJob.companies.name
    document.getElementById('modal-company-industry').textContent = currentJob.companies.industry
    document.getElementById('modal-location').textContent = currentJob.location
    document.getElementById('modal-ctc').textContent = currentJob.ctc
    document.getElementById('modal-job-type').textContent = currentJob.job_type
    document.getElementById('modal-deadline').textContent = new Date(currentJob.deadline).toLocaleDateString()
    document.getElementById('modal-min-cgpa').textContent = currentJob.min_cgpa
    document.getElementById('modal-description').textContent = currentJob.description

    // Requirements
    const requirementsContainer = document.getElementById('modal-requirements')
    requirementsContainer.innerHTML = currentJob.requirements.map(req => 
        `<span class="skill-tag">${req}</span>`
    ).join('')

    // Eligible branches
    const branchesContainer = document.getElementById('modal-branches')
    branchesContainer.innerHTML = currentJob.eligible_branches.map(branch => 
        `<span class="branch-tag">${branch}</span>`
    ).join('')

    // Check eligibility and application status
    const eligibilityStatus = document.getElementById('eligibility-status')
    const applyButton = document.getElementById('apply-button')
    
    if (appliedJobs.has(currentJob.id)) {
        eligibilityStatus.innerHTML = '<div class="status-applied">✅ You have already applied to this job</div>'
        applyButton.style.display = 'none'
    } else if (studentData.cgpa >= currentJob.min_cgpa && currentJob.eligible_branches.includes(studentData.branch)) {
        eligibilityStatus.innerHTML = '<div class="status-eligible">✅ You are eligible for this position</div>'
        applyButton.style.display = 'block'
    } else {
        eligibilityStatus.innerHTML = '<div class="status-not-eligible">❌ You are not eligible for this position</div>'
        applyButton.style.display = 'none'
    }

    // Show modal
    document.getElementById('job-modal').classList.remove('hidden')
}

window.closeJobModal = () => {
    document.getElementById('job-modal').classList.add('hidden')
    currentJob = null
}

window.applyToJob = async () => {
    if (!currentJob) return

    try {
        const { data, error } = await supabase
            .from('applications')
            .insert({
                student_id: studentData.id,
                job_id: currentJob.id,
                status: 'pending'
            })

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                alert('You have already applied to this job!')
                return
            }
            throw error
        }

        // Create notification
        await supabase.from('notifications').insert({
            user_id: currentUser.profile.id,
            message: `Your application for ${currentJob.title} at ${currentJob.companies.name} has been submitted successfully.`,
            type: 'application'
        })

        alert('Application submitted successfully!')
        appliedJobs.add(currentJob.id)
        displayJobs() // Refresh the display
        closeJobModal()

    } catch (error) {
        alert('Error applying to job: ' + error.message)
    }
}

// Close modal when clicking outside
window.onclick = (event) => {
    const modal = document.getElementById('job-modal')
    if (event.target === modal) {
        closeJobModal()
    }
}
