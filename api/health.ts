const hasEnv = (key: string) => Boolean(process.env[key]);

export default {
  async fetch() {
    return Response.json(
      {
        ok: true,
        runtime: 'vercel-function',
        env: {
          SUPABASE_URL: hasEnv('SUPABASE_URL'),
          VITE_SUPABASE_URL: hasEnv('VITE_SUPABASE_URL'),
          SUPABASE_ANON_KEY: hasEnv('SUPABASE_ANON_KEY'),
          VITE_SUPABASE_ANON_KEY: hasEnv('VITE_SUPABASE_ANON_KEY'),
          VITE_SUPABASE_ANON: hasEnv('VITE_SUPABASE_ANON'),
          API_KEY: hasEnv('API_KEY'),
        },
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  },
};
