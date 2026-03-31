import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://neqvvrhzblrpcsfyggiw.supabase.co'
const supabaseKey = 'sb_publishable_pA0xGHjAbx0g2kiEjSUn2A__ksNTYYZ'

export const supabase = createClient(supabaseUrl, supabaseKey)
