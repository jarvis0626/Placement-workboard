// Student-specific JS for PlacementPro with Supabase Integration

// Global variables
let currentUser = null
let studentData = null

// Ensure a valid session first
const { data: { user } } = await supabase.auth.getUser()
if (!user) { location.href = 'index.html'; return false }

// Get the profile id for the current auth.user
const { data: profile, error: pErr } = await supabase
  .from('user_profiles')
  .select('id, full_name, email, role')
  .eq('auth_user_id', user.id)
  .single()
if (pErr || !profile) { alert('Profile not found'); return false }

// Now fetch the student row joined to user_profiles with an explicit join
const { data: student, error: sErr } = await supabase
  .from('students')
  .select(`
    id, branch, passing_year, cgpa, phone, skills, resume_url, profile_complete,
    user_profiles!inner(id, full_name, email)
  `)
  .eq('user_id', profile.id)
  .single()

if (sErr) { console.error(sErr); alert('Error loading student'); return false }

studentData = { ...student, user_profiles: student.user_profiles }
currentUser = { user, profile } // keep both handy
return true

    
// --- Student Dashboard Functions ---
async function showStudentDashboard() {
	if (!await initializeStudent()) return

	try {
		// Update UI with student info
		updateStudentUI()
        
		// Load dashboard data
		await Promise.all([
			loadStudentStats(),
			loadRecentApplications(),
			loadLatestJobs(),
			loadUpcomingInterviews(),
			loadNotifications()
		])

	} catch (error) {/* ... */}
}

function updateStudentUI() {
	if (!studentData) return
	const elements = {
		'student-name': studentData.user_profiles.full_name,
		'user-name': studentData.user_profiles.full_name.split(' ')[0],
		'cgpa-display': studentData.cgpa?.toFixed(1) || '0.0',
		'completion-percentage': studentData.profile_complete || 0
	}

	Object.entries(elements).forEach(([id, value]) => {/* ... */})

	// Show profile completion alert if needed
	if ((studentData.profile_complete || 0) < 90) {/* ... */}
}

async function loadStudentStats() {
	try {/* ... */} catch (error) {/* ... */}
}

async function loadRecentApplications() {
	try {/* ... */} catch (error) {/* ... */}
}

async function loadLatestJobs() {
	try {/* ... */} catch (error) {/* ... */}
}

async function loadUpcomingInterviews() {
	try {/* ... */} catch (error) {/* ... */}
}

async function loadNotifications() {
	try {/* ... */} catch (error) {/* ... */}
}

// --- Profile Management Functions ---
async function showProfilePage() {
	if (!await initializeStudent()) return
	try {/* ... */} catch (error) {/* ... */}
}

function populateProfileForm() {
	if (!studentData) return
	const formFields = {
		'profile-name': studentData.user_profiles.full_name,
		'profile-email': studentData.user_profiles.email,
		'profile-phone': studentData.phone || '',
		'profile-branch': studentData.branch,
		'profile-year': studentData.passing_year,
		'profile-cgpa': studentData.cgpa
	}

	Object.entries(formFields).forEach(([id, value]) => {/* ... */})

	// Populate skills
	const skillsContainer = document.getElementById('skills-container')
	if (skillsContainer && studentData.skills) {/* ... */}

	updateProfileProgress()
}

async function handleProfileUpdate(e) {
	e.preventDefault()
	try {/* ... */} catch (error) {/* ... */}
}

function getCurrentSkills() {
	const skillTags = document.querySelectorAll('.skill-tag')
	return Array.from(skillTags).map(tag => tag.textContent.trim().replace('×', ''))
}

function calculateProfileCompletion() {
	const requiredFields = ['phone', 'cgpa', 'skills']
	const filledFields = requiredFields.filter(field => {/* ... */})
	return Math.round((filledFields.length / requiredFields.length) * 100)
}

// --- Application Functions ---
async function quickApply(jobId) {
	try {/* ... */} catch (error) {/* ... */}
}

async function loadStudentApplications(studentId = null) {
	const id = studentId || studentData?.id
	if (!id) return
	try {/* ... */} catch (error) {/* ... */}
}

// --- Utility Functions ---
async function markNotificationRead(notificationId) {
	try {/* ... */} catch (error) {/* ... */}
}

function addSkill() {
	const skillInput = document.getElementById('skill-input')
	const skillsContainer = document.getElementById('skills-container')
	if (!skillInput || !skillsContainer) return
	const skill = skillInput.value.trim()
	if (!skill) return
	// Check if skill already exists
	const existingSkills = getCurrentSkills()
	if (existingSkills.includes(skill)) {/* ... */}
	// Add skill tag
	const skillTag = document.createElement('span')
	skillTag.className = 'skill-tag'
	skillTag.innerHTML = `${skill} <button type="button" onclick="removeSkill('${skill}')">&times;</button>`
	skillsContainer.appendChild(skillTag)
	skillInput.value = ''
	updateProfileProgress()
}

function removeSkill(skillToRemove) {
	const skillTags = document.querySelectorAll('.skill-tag')
	skillTags.forEach(tag => {/* ... */})
	updateProfileProgress()
}

function updateProfileProgress() {
	const progress = calculateProfileCompletion()
	const progressElement = document.getElementById('profile-progress')
	const progressBar = document.getElementById('profile-progress-bar')
	if (progressElement) {/* ... */}
	if (progressBar) {/* ... */}
}

// --- Helper Functions ---
function updateElement(id, content) {
	const element = document.getElementById(id)
	if (element) {/* ... */}
}

function formatDate(dateString) {
	return new Date(dateString).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	})
}

function formatStatus(status) {
	const statusMap = {
		'pending': 'Pending Review',
		'shortlisted': 'Shortlisted',
		'interview_scheduled': 'Interview Scheduled',
		'selected': 'Selected',
		'rejected': 'Rejected',
		'scheduled': 'Scheduled',
		'completed': 'Completed',
		'cancelled': 'Cancelled',
		'rescheduled': 'Rescheduled'
	}
	return statusMap[status] || status.replace('_', ' ').toUpperCase()
}

function getNotificationIcon(type) {
	const icons = {
		'application': '📋',
		'interview': '📅',
		'shortlist': '⭐',
		'system': '🔔'
	}
	return icons[type] || '📢'
}

function showSuccess(message) {
	// You can implement a toast notification system here
	alert('✅ ' + message)
}

function showError(message) {
	// You can implement a toast notification system here
	alert('❌ ' + message)
}

// Export functions for global use
window.studentModule = {
	showStudentDashboard,
	showProfilePage,
	handleProfileUpdate,
	quickApply,
	addSkill,
	removeSkill,
	markNotificationRead
}
