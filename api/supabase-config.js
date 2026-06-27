module.exports = function handler(request, response) {
  const url = process.env.SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || "";

  response.setHeader("Cache-Control", "no-store, max-age=0");
  if (!url || !anonKey) {
    return response.status(503).json({
      configured: false,
      error: "SUPABASE_URL y SUPABASE_ANON_KEY no están configuradas."
    });
  }

  return response.status(200).json({configured:true, url, anonKey});
};
