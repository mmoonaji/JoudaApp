const SUPABASE_STORAGE_PUBLIC_PATTERN = /^https:\/\/([^.]+)\.supabase\.co\/storage\/v1\/object\/public\/(.+)$/;

export const rewriteSupabaseStorageUrl = (url?: string | null): string => {
  if (!url) return url ?? '';
  if (url.startsWith('/api/media?url=')) return url;

  try {
    const parsedUrl = new URL(url);
    if (!SUPABASE_STORAGE_PUBLIC_PATTERN.test(parsedUrl.toString())) return url;
    return `/api/media?url=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
};
