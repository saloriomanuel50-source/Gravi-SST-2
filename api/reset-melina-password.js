import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const { data, error } = await supabase.auth.admin.updateUserById(
    'b79772a6-5088-46e3-8290-26ffdb0b5519',
    { password: 'Gravi2026!' }
  )

  if (error) {
    return res.status(400).json({ ok: false, error: error.message })
  }

  return res.status(200).json({ ok: true, email: data.user.email })
}