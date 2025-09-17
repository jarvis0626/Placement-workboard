// Student-specific JS for PlacementPro with Supabase Integration

// Global variables
let currentUser = null;
let studentData = null;

// Fetch and display student profile on dashboard
document.addEventListener('DOMContentLoaded', async () => {
    console.log('student.js loaded (module)');
    if (!window.supabase) {
        console.error('supabase client not available on window');
        showProfileError('Internal error: Supabase client not loaded');
        return;
    }

    // Initialize and load dashboard
    const initialized = await initializeStudent();
    if (initialized) {
        updateStudentUI();
        await loadDashboardData();
    }
});

// Ensure a valid session and load student data
async function initializeStudent() {    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { 
            location.href = 'index.html'; 
            return false; 
        }

        const { data: profile, error: pErr } = await supabase
            .from('user_profiles')
            .select('id, full_name, email, role')
            .eq('auth_user_id', user.id)
            .single();
            
        if (pErr || !profile) { 
            showProfileError('Profile not found. Please complete registration.');
            return false; 
        }

        const { data: student, error: sErr } = await supabase
            .from('students')
            .select(`
                id, branch, passing_year, cgpa, phone, skills, resume_url, profile_complete
            `)
            .eq('user_id', profile.id)
            .single();

        if (sErr) { 
            showProfileError('Student record not found. Please contact support.');
            return false; 
        }

        // Store globally
        studentData = { ...student, user_profiles: profile };
        currentUser = { user, profile };

        // Update basic profile fields
        document.getElementById('student-name').textContent = profile.full_name || 'Student';
        document.getElementById('student-email').textContent = profile.email || user.email;
        document.getElementById('student-branch').textContent = student?.branch || '';
        document.getElementById('student-cgpa').textContent = student?.cgpa || '';
        document.getElementById('student-year').textContent = student?.passing_year || '';
        document.getElementById('profile-complete').textContent = (student?.profile_complete ?? 0) + '%';

        // Store for global access
        window.studentProfile = { ...profile, ...student };
        
        return true;
    } catch (err) {
        console.error('initializeStudent error', err);
        showProfileError('Error loading profile: ' + (err.message || err));
        return false;
    }
}

// Load all dashboard data
async function loadDashboardData() {
    try {
        await Promise.all([
            loadStudentStats(),
            loadLatestJobs(),
            loadRecentApplications(),
            loadUpcomingInterviews(),
            loadNotifications()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Update UI with student info
function updateStudentUI() {
    if (!studentData) return;
    
    const elements = {
        'student-name': studentData.user_profiles.full_name,
        'user-name': studentData.user_profiles.full_name?.split(' ')[0],
        'cgpa-display': studentData.cgpa?.toFixed(1) || '0.0',
        'completion-percentage': studentData.profile_complete || 0
    };

    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });

    // Show profile completion alert if needed
    if ((studentData.profile_complete || 0) < 90) {
        const alert = document.getElementById('profile-alert');
        if (alert) {
            alert.textContent = 'Complete your profile to improve job matching!';
            alert.classList.remove('hidden');
        }
    }
}

// Stats: applied, shortlisted, offers, interviews
async function loadStudentStats() {
    if (!studentData) return;
    
    try {
        const sid = studentData.id;

        // Get applications
        const { data: apps, error: appErr } = await supabase
            .from('applications')
            .select('status')
            .eq('student_id', sid);

        if (appErr) {
            console.error('Error loading applications:', appErr);
            return;
        }

        const applied = apps?.length || 0;
        const shortlisted = apps?.filter(a => a.status === 'shortlisted').length || 0;
        const offers = apps?.filter(a => a.status === 'selected').length || 0;

        // Get interviews through applications
        const { data: interviews, error: intErr } = await supabase
            .from('interviews')
            .select(`
                id,
                applications!inner(student_id)
            `)
            .eq('applications.student_id', sid);

        const interviewCount = interviews?.length || 0;

        // Update UI
        setText('applied-count', String(applied));
        setText('shortlisted-count', String(shortlisted));
        setText('offers-count', String(offers));
        setText('interviews-count', String(interviewCount));
        
    } catch (error) {
        console.error('Error in loadStudentStats:', error);
    }
}

// Recent job postings (eligible by cgpa/branch, upcoming deadlines)
async function loadLatestJobs() {
    if (!studentData) return;
    
    try {
        const branch = studentData.branch;
        const cgpa = studentData.cgpa || 0;

        // Get recent jobs
        const { data: jobs, error } = await supabase
            .from('jobs')
            .select(`
                id, title, location, ctc, deadline,
                companies(name)
            `)
            .lte('min_cgpa', cgpa)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('Error loading jobs:', error);
            return;
        }

        const list = document.getElementById('recent-jobs-list');
        if (!jobs || jobs.length === 0) {
            if (list) list.innerHTML = '<div class="job-item empty-state">No recent jobs found.</div>';
            return;
        }

        const rows = jobs.map(j => {
            const title = j.title || 'Job';
            const company = j.companies?.name ? ` • ${j.companies.name}` : '';
            const location = j.location ? ` · ${j.location}` : '';
            const ctc = j.ctc ? `<span class="text-green">${j.ctc}</span>` : '';
            const deadline = j.deadline ? 
                `<span class="item-subtle">Due ${new Date(j.deadline).toLocaleDateString()}</span>` : '';
            
            return `
                <div class="item-row job-item">
                    <div class="item-meta">
                        <span class="item-title">${title}${company}${location}</span>
                    </div>
                    <div class="item-meta">
                        ${ctc}
                        ${deadline}
                    </div>
                </div>`;
        }).join('');

        setHTML('recent-jobs-list', rows);
        
    } catch (error) {
        console.error('Error in loadLatestJobs:', error);
    }
}

// Applications list (latest 5) with status badges
async function loadRecentApplications() {
    if (!studentData) return;
    
    try {
        const sid = studentData.id;

        const { data: applications, error } = await supabase
            .from('applications')
            .select(`
                id, status, applied_at,
                jobs(title, location, companies(name))
            `)
            .eq('student_id', sid)
            .order('applied_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('Error loading applications:', error);
            return;
        }

        const list = document.getElementById('applications-list');
        if (!applications || applications.length === 0) {
            if (list) list.innerHTML = '<div class="application-item empty-state">No applications yet.</div>';
            return;
        }

        const badgeClass = (status) => {
            const classes = {
                pending: 'badge--pending',
                shortlisted: 'badge--shortlisted',
                interview_scheduled: 'badge--scheduled',
                selected: 'badge--selected',
                rejected: 'badge--rejected'
            };
            return classes[status] || 'badge--pending';
        };

        const items = applications.map(app => {
            const title = app.jobs?.title || 'Job';
            const company = app.jobs?.companies?.name ? ` • ${app.jobs.companies.name}` : '';
            const when = app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '';
            const statusText = formatStatus(app.status);
            
            return `
                <div class="item-row application-item">
                    <div class="item-meta">
                        <span class="item-title">${title}${company}</span>
                        <span class="item-subtle">${when}</span>
                    </div>
                    <span class="badge ${badgeClass(app.status)}">${statusText}</span>
                </div>`;
        }).join('');

        setHTML('applications-list', items);
        
    } catch (error) {
        console.error('Error in loadRecentApplications:', error);
    }
}

// Upcoming interviews (joined through applications)
async function loadUpcomingInterviews() {
    if (!studentData) return;
    
    try {
        const sid = studentData.id;

        const { data: interviews, error } = await supabase
            .from('interviews')
            .select(`
                id, scheduled_date, scheduled_time, mode, status, interviewer,
                applications!inner(
                    id, student_id,
                    jobs(title, companies(name))
                )
            `)
            .eq('applications.student_id', sid)
            .order('scheduled_date', { ascending: true })
            .limit(5);

        if (error) {
            console.error('Error loading interviews:', error);
            return;
        }

        // Find or create interviews container
        let container = document.getElementById('interviews-list');
        if (!container) {
            const grid = document.querySelector('.dashboard-grid');
            if (grid) {
                const card = document.createElement('div');
                card.className = 'dashboard-card';
                card.innerHTML = `
                    <div class="card-header">
                        <h3>Upcoming Interviews</h3>
                    </div>
                    <div id="interviews-list" class="card-content">
                    </div>
                `;
                grid.appendChild(card);
                container = card.querySelector('#interviews-list');
            }
        }

        if (!interviews || interviews.length === 0) {
            if (container) container.innerHTML = '<div class="interview-item empty-state">No upcoming interviews.</div>';
            return;
        }

        const rows = interviews.map(interview => {
            const job = interview.applications?.jobs?.title || 'Interview';
            const company = interview.applications?.jobs?.companies?.name ? 
                ` • ${interview.applications.jobs.companies.name}` : '';
            const date = interview.scheduled_date ? 
                new Date(interview.scheduled_date).toLocaleDateString() : '';
            const time = interview.scheduled_time || '';
            const mode = interview.mode || 'Online';
            const interviewer = interview.interviewer ? 
                `<span class="item-subtle">With ${interview.interviewer}</span>` : '';
            const status = interview.status || 'scheduled';
            
            return `
                <div class="item-row interview-item">
                    <div class="item-meta">
                        <span class="item-title">${job}${company}</span>
                        <span class="badge badge--${status.replace(/_/g, '-')}">${formatStatus(status)}</span>
                    </div>
                    <div class="item-meta">
                        <span class="item-subtle">${date} · ${time}</span>
                        <span class="item-subtle">(${mode})</span>
                        ${interviewer}
                    </div>
                </div>`;
        }).join('');

        if (container) container.innerHTML = rows;
        
    } catch (error) {
        console.error('Error in loadUpcomingInterviews:', error);
    }
}

// Simple announcements/notifications list (latest 5)
async function loadNotifications() {
    if (!currentUser?.profile) return;
    
    try {
        const uid = currentUser.profile.id;

        const { data: notifications, error } = await supabase
            .from('notifications')
            .select('id, message, type, is_read, created_at')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('Error loading notifications:', error);
            return;
        }

        const list = document.getElementById('announcements-list');
        if (!notifications || notifications.length === 0) {
            if (list) list.innerHTML = '<div class="notification-item empty-state">No announcements at this time.</div>';
            return;
        }

        const items = notifications.map(notification => {
            const icon = getNotificationIcon(notification.type);
            return `
                <div class="item-row notification-item ${notification.is_read ? '' : 'unread'}" 
                     onclick="markNotificationRead('${notification.id}')">
                    <div class="item-meta">
                        <span>${icon} ${notification.message}</span>
                    </div>
                    <span class="item-subtle">${new Date(notification.created_at).toLocaleDateString()}</span>
                </div>
            `;
        }).join('');

        setHTML('announcements-list', items);
        
    } catch (error) {
        console.error('Error in loadNotifications:', error);
    }
}

// --- Application Functions ---
async function quickApply(jobId) {
    if (!studentData) return;
    
    try {
        // Check if already applied
        const { data: existing } = await supabase
            .from('applications')
            .select('id')
            .eq('student_id', studentData.id)
            .eq('job_id', jobId)
            .single();

        if (existing) {
            showError('You have already applied to this job');
            return;
        }

        // Create application
        const { error } = await supabase
            .from('applications')
            .insert({
                student_id: studentData.id,
                job_id: jobId,
                status: 'pending'
            });

        if (error) {
            showError('Failed to apply: ' + error.message);
            return;
        }

        showSuccess('Application submitted successfully!');
        
        // Refresh data
        await loadDashboardData();
        
    } catch (error) {
        console.error('Error in quickApply:', error);
        showError('Error submitting application');
    }
}

// --- Utility Functions ---
async function markNotificationRead(notificationId) {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (!error) {
            // Remove unread class
            const notification = document.querySelector(`[onclick="markNotificationRead('${notificationId}')"]`);
            if (notification) {
                notification.classList.remove('unread');
            }
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// --- Profile Management Functions ---
async function showProfilePage() {
    if (!await initializeStudent()) return;
    try {
        populateProfileForm();
    } catch (error) {
        console.error('Error showing profile page:', error);
    }
}

function populateProfileForm() {
    if (!studentData) return;
    
    const formFields = {
        'profile-name': studentData.user_profiles.full_name,
        'profile-email': studentData.user_profiles.email,
        'profile-phone': studentData.phone || '',
        'profile-branch': studentData.branch,
        'profile-year': studentData.passing_year,
        'profile-cgpa': studentData.cgpa
    };

    Object.entries(formFields).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    });

    // Populate skills
    const skillsContainer = document.getElementById('skills-container');
    if (skillsContainer && studentData.skills) {
        skillsContainer.innerHTML = '';
        studentData.skills.forEach(skill => {
            const skillTag = document.createElement('span');
            skillTag.className = 'skill-tag';
            skillTag.innerHTML = `${skill} <button type="button" onclick="removeSkill('${skill}')">&times;</button>`;
            skillsContainer.appendChild(skillTag);
        });
    }

    updateProfileProgress();
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    try {
        const formData = new FormData(e.target);
        const skills = getCurrentSkills();
        
        // Update user profile
        await supabase
            .from('user_profiles')
            .update({
                full_name: formData.get('name')
            })
            .eq('id', currentUser.profile.id);

        // Update student record
        const completion = calculateProfileCompletion();
        await supabase
            .from('students')
            .update({
                phone: formData.get('phone'),
                branch: formData.get('branch'),
                passing_year: parseInt(formData.get('year')),
                cgpa: parseFloat(formData.get('cgpa')),
                skills: skills,
                profile_complete: completion
            })
            .eq('id', studentData.id);

        showSuccess('Profile updated successfully!');
        
        // Refresh data
        await initializeStudent();
        updateStudentUI();
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showError('Failed to update profile');
    }
}

function getCurrentSkills() {
    const skillTags = document.querySelectorAll('.skill-tag');
    return Array.from(skillTags).map(tag => tag.textContent.trim().replace('×', ''));
}

function calculateProfileCompletion() {
    if (!studentData) return 0;
    
    const requiredFields = ['phone', 'cgpa', 'skills'];
    const filledFields = requiredFields.filter(field => {
        if (field === 'skills') return studentData.skills && studentData.skills.length > 0;
        return studentData[field];
    });
    
    return Math.round((filledFields.length / requiredFields.length) * 100);
}

function addSkill() {
    const skillInput = document.getElementById('skill-input');
    const skillsContainer = document.getElementById('skills-container');
    if (!skillInput || !skillsContainer) return;
    
    const skill = skillInput.value.trim();
    if (!skill) return;
    
    // Check if skill already exists
    const existingSkills = getCurrentSkills();
    if (existingSkills.includes(skill)) {
        showError('Skill already exists');
        return;
    }
    
    // Add skill tag
    const skillTag = document.createElement('span');
    skillTag.className = 'skill-tag';
    skillTag.innerHTML = `${skill} <button type="button" onclick="removeSkill('${skill}')">&times;</button>`;
    skillsContainer.appendChild(skillTag);
    skillInput.value = '';
    updateProfileProgress();
}

function removeSkill(skillToRemove) {
    const skillTags = document.querySelectorAll('.skill-tag');
    skillTags.forEach(tag => {
        if (tag.textContent.trim().replace('×', '') === skillToRemove) {
            tag.remove();
        }
    });
    updateProfileProgress();
}

function updateProfileProgress() {
    const progress = calculateProfileCompletion();
    const progressElement = document.getElementById('profile-progress');
    const progressBar = document.getElementById('profile-progress-bar');
    
    if (progressElement) progressElement.textContent = progress + '%';
    if (progressBar) progressBar.style.width = progress + '%';
}

// --- Helper Functions ---
function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value ?? '';
}

function setHTML(id, html) {
    const element = document.getElementById(id);
    if (element) element.innerHTML = html;
}

function updateElement(id, content) {
    const element = document.getElementById(id);
    if (element) element.textContent = content;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
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
    };
    return statusMap[status] || status.replace('_', ' ').toUpperCase();
}

function getNotificationIcon(type) {
    const icons = {
        'application': '📋',
        'interview': '📅',
        'shortlist': '⭐',
        'system': '🔔'
    };
    return icons[type] || '📢';
}

function showSuccess(message) {
    // Simple alert - you can implement toast notifications here
    alert('✅ ' + message);
}

function showError(message) {
    // Simple alert - you can implement toast notifications here
    alert('❌ ' + message);
}

function showProfileError(msg) {
    const alert = document.getElementById('profile-alert');
    if (alert) {
        alert.textContent = msg;
        alert.classList.remove('hidden');
        alert.classList.add('error');
    }
}

// Ensure profile exists and insert a student record if the role is student
async function ensureProfileExists(userId, branch, passing_year, cgpa) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Ensure profile exists
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, role')
        .eq('auth_user_id', user.id)
        .single();

    if (profile.role === 'student') {
        await supabase.from('students').insert({
            user_id: profile.id,       // link to profile
            branch,
            passing_year,
            cgpa,
            profile_complete: 60
        });
    }
}

// Export functions for global use
window.studentModule = {
    showStudentDashboard,
    showProfilePage,
    handleProfileUpdate,
    quickApply,
    addSkill,
    removeSkill,
    markNotificationRead,
    loadDashboardData
};
