// Supabase Configuration and Shared Client
// Replace with your actual Supabase URL and Anon Key

const SUPABASE_URL = 'https://fyhuvbiczgwsghnuwjdx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5aHV2Ymljemd3c2dobnV3amR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MjM1MzYsImV4cCI6MjA3MzM5OTUzNn0.DlUTQzarGqKEzYDb9JFeUC_FHqVNY9wUNuBbXxfzGC8'

// Initialize Supabase client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Shared authentication utilities
window.authUtils = {
  // Get current user and profile
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role, full_name')
      .eq('auth_user_id', user.id)
      .single()
    
    return { user, profile }
  },

  // Require specific role for page access
  async requireRole(allowedRoles) {
    const userData = await this.getCurrentUser()
    if (!userData || !allowedRoles.includes(userData.profile?.role)) {
      alert('Access denied. Redirecting to login.')
      location.href = 'index.html'
      return null
    }
    return userData
  },

  // Sign out
  async signOut() {
    await supabase.auth.signOut()
    location.href = 'index.html'
  }
}

// Auth state listener
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    location.href = 'index.html'
  }
})

console.log('Supabase client initialized')