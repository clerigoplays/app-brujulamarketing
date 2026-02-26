import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qsfreouatxmzgmeumcjq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnJlb3VhdHhtemdtZXVtY2pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDA0NzcsImV4cCI6MjA4NzU3NjQ3N30.CGXToyTJVeinHuQl8TgPR7jtqKiU7K_0_BbaVML4mIU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)