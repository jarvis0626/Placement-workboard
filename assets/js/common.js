// Magic link / OTP sign-in handler (if used)
window.handleOtpSignIn = async (e) => {
	e.preventDefault()
	const email = document.getElementById('otp-email').value.trim().toLowerCase()
	const redirectTo = 'https://jarvis0626.github.io/Placement-workboard/'
	showLoading(true)
	try {
		const { data: otpData, error: otpErr } = await supabase.auth.signInWithOtp({
			email,
			options: { emailRedirectTo: redirectTo }
		})
		if (otpErr) throw otpErr
		alert('Check your email for the magic link to sign in.')
		showLogin()
	} catch (error) {
		alert('OTP sign-in failed: ' + (error.message || error.description || error))
	} finally {
		showLoading(false)
	}
}
// Common JS for PlacementPro (navigation, notifications, etc.)

// --- Shared Application Data and State ---
const applicationData = {
	"users": [
		{"id": 1, "email": "john.doe@college.edu", "role": "student", "name": "John Doe", "branch": "Computer Science", "year": 2024, "cgpa": 8.5, "status": "active"},
		{"id": 2, "email": "admin@college.edu", "role": "staff", "name": "Admin User", "department": "Placement Cell"},
		{"id": 3, "email": "hr@techcorp.com", "role": "company", "name": "TechCorp HR", "company": "TechCorp Solutions"}
	],
	"companies": [
		{"id": 1, "name": "TechCorp Solutions", "industry": "Software", "website": "techcorp.com", "logo": "tech-logo.png", "status": "approved", "established": 2015},
		{"id": 2, "name": "DataFlow Inc", "industry": "Data Analytics", "website": "dataflow.com", "logo": "data-logo.png", "status": "pending", "established": 2018},
		{"id": 3, "name": "CloudSys Ltd", "industry": "Cloud Computing", "website": "cloudsys.com", "logo": "cloud-logo.png", "status": "approved", "established": 2012},
		{"id": 4, "name": "FinTech Pro", "industry": "Financial Technology", "website": "fintechpro.com", "logo": "fin-logo.png", "status": "approved", "established": 2020}
	],
	"jobs": [
		{"id": 1, "company_id": 1, "title": "Software Developer", "description": "Full stack development role", "requirements": ["Python", "React", "SQL"], "ctc": "6-8 LPA", "location": "Bangalore", "type": "Full-time", "deadline": "2024-03-15", "min_cgpa": 7.5, "eligible_branches": ["Computer Science", "Information Technology"]},
		{"id": 2, "company_id": 2, "title": "Data Analyst", "description": "Analyze business data and create insights", "requirements": ["Python", "SQL", "Excel", "Tableau"], "ctc": "5-7 LPA", "location": "Hyderabad", "type": "Full-time", "deadline": "2024-03-20", "min_cgpa": 7.0, "eligible_branches": ["Computer Science", "Electronics", "Mathematics"]},
		{"id": 3, "company_id": 3, "title": "Cloud Engineer", "description": "Manage cloud infrastructure and deployments", "requirements": ["AWS", "Docker", "Kubernetes", "Linux"], "ctc": "7-9 LPA", "location": "Mumbai", "type": "Full-time", "deadline": "2024-03-25", "min_cgpa": 7.5, "eligible_branches": ["Computer Science", "Information Technology"]},
		{"id": 4, "company_id": 4, "title": "Backend Developer", "description": "Build scalable backend systems", "requirements": ["Java", "Spring Boot", "MySQL", "Redis"], "ctc": "6-8 LPA", "location": "Pune", "type": "Full-time", "deadline": "2024-03-18", "min_cgpa": 7.0, "eligible_branches": ["Computer Science", "Information Technology", "Electronics"]}
	],
	"students": [
		{"id": 1, "name": " ", "email": "john.doe@college.edu", "branch": "Computer Science", "year": 2024, "cgpa": 8.5, "phone": "+91-9876543210", "skills": ["Python", "React", "Node.js", "SQL"], "resume": "john_doe_resume.pdf", "profile_complete": 90},
		{"id": 2, "name": "Jane Smith", "email": "jane.smith@college.edu", "branch": "Information Technology", "year": 2024, "cgpa": 8.8, "phone": "+91-9876543211", "skills": ["Java", "Spring", "Angular", "MySQL"], "resume": "jane_smith_resume.pdf", "profile_complete": 95},
		{"id": 3, "name": "Mike Johnson", "email": "mike.johnson@college.edu", "branch": "Electronics", "year": 2024, "cgpa": 7.9, "phone": "+91-9876543212", "skills": ["Python", "MATLAB", "Circuit Design"], "resume": "mike_johnson_resume.pdf", "profile_complete": 75},
		{"id": 4, "name": "Sarah Davis", "email": "sarah.davis@college.edu", "branch": "Computer Science", "year": 2024, "cgpa": 9.1, "phone": "+91-9876543213", "skills": ["Python", "Machine Learning", "TensorFlow", "AWS"], "resume": "sarah_davis_resume.pdf", "profile_complete": 100}
	],
	"applications": [
		{"id": 1, "student_id": 1, "job_id": 1, "status": "pending", "applied_date": "2024-03-01", "company_name": "TechCorp Solutions", "job_title": "Software Developer"},
		{"id": 2, "student_id": 1, "job_id": 3, "status": "shortlisted", "applied_date": "2024-03-02", "company_name": "CloudSys Ltd", "job_title": "Cloud Engineer"},
		{"id": 3, "student_id": 2, "job_id": 1, "status": "interview_scheduled", "applied_date": "2024-03-01", "company_name": "TechCorp Solutions", "job_title": "Software Developer"},
		{"id": 4, "student_id": 2, "job_id": 4, "status": "selected", "applied_date": "2024-02-28", "company_name": "FinTech Pro", "job_title": "Backend Developer"}
	],
	"interviews": [
		{"id": 1, "student_id": 2, "job_id": 1, "company_id": 1, "date": "2024-03-15", "time": "10:00 AM", "mode": "Online", "status": "scheduled", "interviewer": "Tech Lead", "student_name": "Jane Smith", "company_name": "TechCorp Solutions", "job_title": "Software Developer"},
		{"id": 2, "student_id": 1, "job_id": 3, "company_id": 3, "date": "2024-03-18", "time": "2:00 PM", "mode": "On-site", "status": "scheduled", "interviewer": "Senior Engineer", "student_name": "John Doe", "company_name": "CloudSys Ltd", "job_title": "Cloud Engineer"},
		{"id": 3, "student_id": 4, "job_id": 2, "company_id": 2, "date": "2024-03-20", "time": "11:00 AM", "mode": "Online", "status": "completed", "interviewer": "Data Science Manager", "student_name": "Sarah Davis", "company_name": "DataFlow Inc", "job_title": "Data Analyst"}
	],
	"notifications": [
		{"id": 1, "user_id": 1, "message": "Your application for Software Developer at TechCorp Solutions is under review", "type": "application", "read": false, "date": "2024-03-10"},
		{"id": 2, "user_id": 2, "message": "Interview scheduled for Backend Developer role on March 15th", "type": "interview", "read": false, "date": "2024-03-08"},
		{"id": 3, "user_id": 1, "message": "You have been shortlisted for Cloud Engineer position", "type": "shortlist", "read": true, "date": "2024-03-05"}
	],
	"analytics": {
		"total_students": 150,
		"total_companies": 25,
		"total_jobs": 45,
		"total_applications": 320,
		"placement_rate": 75,
		"avg_ctc": 6.8,
		"top_recruiting_companies": ["TechCorp Solutions", "FinTech Pro", "CloudSys Ltd"],
		"branch_wise_placements": {
			"Computer Science": 45,
			"Information Technology": 38,
			"Electronics": 22,
			"Mechanical": 15
		},
		"salary_distribution": {
			"3-5 LPA": 25,
			"5-7 LPA": 40,
			"7-10 LPA": 30,
			"10+ LPA": 5
		}
	}
};

// Global State

// --- Auth and Landing Page Logic (migrated from index.html) ---
// Auth form switching
window.showLogin = () => {
	document.getElementById('login-form').classList.add('active')
	document.getElementById('signup-form').classList.remove('active')
	document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'))
	document.querySelectorAll('.auth-tab')[0].classList.add('active')
}

window.showSignup = () => {
	document.getElementById('signup-form').classList.add('active')
	document.getElementById('login-form').classList.remove('active')
	document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'))
	document.querySelectorAll('.auth-tab')[1].classList.add('active')
}

// Show/hide conditional fields based on role
window.addEventListener('DOMContentLoaded', () => {
	const signupRole = document.getElementById('signup-role')
	if (signupRole) {
		signupRole.addEventListener('change', (e) => {
			const role = e.target.value
			const studentFields = document.getElementById('student-fields')
			const companyFields = document.getElementById('company-fields')
			if (studentFields) studentFields.style.display = role === 'student' ? 'block' : 'none'
			if (companyFields) companyFields.style.display = role === 'company' ? 'block' : 'none'
		})
	}
})

// Sign In Handler
window.handleSignIn = async (e) => {
	e.preventDefault()
	const email = document.getElementById('login-email').value.trim().toLowerCase()
	const password = document.getElementById('login-password').value
	showLoading(true)
	try {
		const { error } = await supabase.auth.signInWithPassword({ email, password })
		if (error) throw error

		// fetch profile to route
		const { data: { user } } = await supabase.auth.getUser()
		const { data: profile, error: pErr } = await supabase
			.from('user_profiles').select('role').eq('auth_user_id', user.id).single()
		if (pErr || !profile) throw new Error('Profile missing')

		redirectToDashboard(profile.role)
	} catch (error) {
		alert('Sign in failed: ' + error.message)
	} finally {
		showLoading(false)
	}
}

// Sign Up Handler
window.handleSignUp = async (e) => {
	e.preventDefault()
	const name = document.getElementById('signup-name').value.trim()
	const email = document.getElementById('signup-email').value.trim().toLowerCase()
	const password = document.getElementById('signup-password').value
	const role = document.getElementById('signup-role').value
	const redirectTo = 'https://jarvis0626.github.io/Placement-workboard/'
	showLoading(true)
	try {
		// 1) Create auth user with redirect
		const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
			email,
			password,
			options: { emailRedirectTo: redirectTo }
		})
		if (signUpError) throw signUpError

		// 2) Ensure session (password sign-up often returns session; if null, ask to verify then sign in)
		let { data: { user } } = await supabase.auth.getUser()
		if (!user) {
			alert('Verify email, then sign in to complete setup.')
			showLogin()
			return
		}

		// 3) Insert user profile with RLS-compliant check
		const { error: profileErr } = await supabase.from('user_profiles').insert({
			auth_user_id: user.id,  // must match auth.uid() in policy
			email,
			role,
			full_name: name
		})
		if (profileErr) throw profileErr

		// 4) Role-specific records
		if (role === 'student') {
			const branch = document.getElementById('signup-branch').value.trim()
			const passing_year = parseInt(document.getElementById('signup-year').value)
			const cgpa = parseFloat(document.getElementById('signup-cgpa').value)
			if (!branch || !passing_year || Number.isNaN(cgpa)) throw new Error('Please fill all student fields')

			const { data: profile } = await supabase
				.from('user_profiles').select('id').eq('auth_user_id', user.id).single()

			const { error: stuErr } = await supabase.from('students').insert({
				user_id: profile.id,
				branch,
				passing_year,
				cgpa,
				profile_complete: 60
			})
			if (stuErr) throw stuErr
		}

		if (role === 'company') {
			const companyName = document.getElementById('signup-company').value.trim()
			const industry = document.getElementById('signup-industry').value.trim()
			if (!companyName) throw new Error('Please fill all company fields')

			// upsert company
			let { data: company } = await supabase.from('companies').select('id').eq('name', companyName).single()
			if (!company) {
				const { data: newCompany, error: ncErr } = await supabase
					.from('companies').insert({ name: companyName, industry, status: 'pending' })
					.select('id').single()
				if (ncErr) throw ncErr
				company = newCompany
			}
			const { data: profile } = await supabase.from('user_profiles').select('id').eq('auth_user_id', user.id).single()
			const { error: cuErr } = await supabase.from('company_users').insert({
				user_id: profile.id,
				company_id: company.id,
				title: 'HR Manager'
			})
			if (cuErr) throw cuErr
		}

		alert('Account created! If verification is required, check email, then sign in.')
		showLogin()
	} catch (error) {
		alert('Sign up failed: ' + (error.message || error.description || error))
	} finally {
		showLoading(false)
	}
}

// Create student profile
window.createStudentProfile = async (authUserId) => {
	const branch = document.getElementById('signup-branch').value
	const year = document.getElementById('signup-year').value
	const cgpa = document.getElementById('signup-cgpa').value
	if (!branch || !year || !cgpa) return
	// TODO: Implement Supabase logic to get profile and insert student
}

// Create company profile
window.createCompanyProfile = async (authUserId) => {
	const companyName = document.getElementById('signup-company').value
	const industry = document.getElementById('signup-industry').value
	if (!companyName) return
	// TODO: Implement Supabase logic to get or create company and link user
}

// Redirect based on role
window.redirectToDashboard = (role) => {
	switch(role) {
		case 'student':
			window.location.href = 'dashboard-student.html'; break;
		case 'staff':
			window.location.href = 'dashboard-staff.html'; break;
		case 'company':
			window.location.href = 'dashboard-company.html'; break;
		default:
			window.location.href = 'index.html';
	}
}

// Loading indicator
window.showLoading = (show) => {
	const loading = document.getElementById('loading')
	if (loading) loading.classList.toggle('hidden', !show)
}
let currentUser = null;
let currentView = 'dashboard';
let selectedJob = null;
let selectedRole = null;

// --- Shared/Common Functions ---
function logout() {
	// Clear user and redirect to landing
	localStorage.removeItem('currentUser');
	window.location.href = 'index.html';
}

function closeModal(modalId) {
	const modal = document.getElementById(modalId);
	if (modal) modal.classList.add('hidden');
}

function toggleNotifications() {
	const panel = document.getElementById('notification-panel');
	if (panel) panel.classList.toggle('hidden');
}

function markAsRead(notificationId) {
	// Mark notification as read in applicationData (demo only)
	const notif = applicationData.notifications.find(n => n.id === notificationId);
	if (notif) notif.read = true;
}
