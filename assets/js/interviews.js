// Interviews page JavaScript
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.supabase) {
        console.error('Supabase client not available');
        return;
    }

    // Initialize
    const studentData = await initializeStudent();
    if (studentData) {
        await loadAllInterviews();
        setupFilters();
    }
});

// Initialize student session
async function initializeStudent() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            location.href = 'index.html';
            return null;
        }

        const { data: profile } = await supabase
            .from('user_profiles')
            .select('id, full_name, email, role')
            .eq('auth_user_id', user.id)
            .single();

        if (!profile || profile.role !== 'student') {
            location.href = 'index.html';
            return null;
        }

        const { data: student } = await supabase
            .from('students')
            .select('id, branch, passing_year, cgpa')
            .eq('user_id', profile.id)
            .single();

        if (!student) {
            showToast('Student record not found', 'danger');
            return null;
        }

        return { ...student, user_profiles: profile };
    } catch (error) {
        console.error('Error initializing student:', error);
        showToast('Error loading profile', 'danger');
        return null;
    }
}

// Load all interviews for the student
async function loadAllInterviews(statusFilter = '', searchTerm = '') {
    const studentData = await initializeStudent();
    if (!studentData) return;

    try {
        let query = supabase
            .from('interviews')
            .select(`
                id, scheduled_date, scheduled_time, mode, status, interviewer,
                applications!inner(
                    id, student_id,
                    jobs(title, location, companies(name))
                )
            `)
            .eq('applications.student_id', studentData.id)
            .order('scheduled_date', { ascending: false });

        // Apply status filter
        if (statusFilter) {
            query = query.eq('status', statusFilter);
        }

        const { data: interviews, error } = await query;

        if (error) {
            console.error('Error loading interviews:', error);
            showToast('Error loading interviews', 'danger');
            return;
        }

        // Apply search filter
        let filteredInterviews = interviews || [];
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredInterviews = filteredInterviews.filter(interview => {
                const jobTitle = interview.applications?.jobs?.title?.toLowerCase() || '';
                const companyName = interview.applications?.jobs?.companies?.name?.toLowerCase() || '';
                return jobTitle.includes(term) || companyName.includes(term);
            });
        }

        renderInterviewsTable(filteredInterviews);
        updateInterviewsCount(filteredInterviews.length);

    } catch (error) {
        console.error('Error in loadAllInterviews:', error);
        showToast('Error loading interviews', 'danger');
    }
}

// Render interviews in table
function renderInterviewsTable(interviews) {
    const tbody = document.getElementById('interviews-tbody');
    
    if (!interviews || interviews.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state">
                <td colspan="6">No interviews found.</td>
            </tr>
        `;
        return;
    }

    const rows = interviews.map(interview => {
        const job = interview.applications?.jobs;
        const jobTitle = job?.title || 'N/A';
        const companyName = job?.companies?.name || 'N/A';
        const location = job?.location ? ` (${job.location})` : '';
        
        const date = interview.scheduled_date ? 
            new Date(interview.scheduled_date).toLocaleDateString() : 'TBD';
        const time = interview.scheduled_time || 'TBD';
        const mode = interview.mode || 'Online';
        const interviewer = interview.interviewer || 'TBD';
        const status = interview.status || 'scheduled';

        return `
            <tr>
                <td>${jobTitle}</td>
                <td>${companyName}${location}</td>
                <td>${date}<br><small style="color: #9ca3af;">${time}</small></td>
                <td>${mode}</td>
                <td>${interviewer}</td>
                <td><span class="badge badge--${status.replace(/_/g, '-')}">${formatStatus(status)}</span></td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rows;
}

// Update interviews count
function updateInterviewsCount(count) {
    const countEl = document.getElementById('interviews-count');
    if (countEl) {
        countEl.textContent = `${count} interview${count !== 1 ? 's' : ''}`;
    }
}

// Setup filter event listeners
function setupFilters() {
    const statusFilter = document.getElementById('status-filter');
    const searchInput = document.getElementById('search-interviews');
    const clearBtn = document.getElementById('clear-filters');

    // Status filter change
    statusFilter?.addEventListener('change', () => {
        const status = statusFilter.value;
        const search = searchInput?.value || '';
        loadAllInterviews(status, search);
    });

    // Search input
    searchInput?.addEventListener('input', debounce(() => {
        const search = searchInput.value;
        const status = statusFilter?.value || '';
        loadAllInterviews(status, search);
    }, 300));

    // Clear filters
    clearBtn?.addEventListener('click', () => {
        if (statusFilter) statusFilter.value = '';
        if (searchInput) searchInput.value = '';
        loadAllInterviews();
    });
}

// Format status for display
function formatStatus(status) {
    const statusMap = {
        'scheduled': 'Scheduled',
        'completed': 'Completed',
        'cancelled': 'Cancelled',
        'rescheduled': 'Rescheduled'
    };
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}
