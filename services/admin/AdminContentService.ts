import { supabase } from '../supabaseClient';
import { compressImage } from '../../utils/imageCompression';

export const AdminContentService = {
  // ==========================
  // STORAGE (IMAGES)
  // ==========================
  async uploadAdminImage(file: File, folder: string = 'general'): Promise<string> {
    const compressed = await compressImage(file);
    const ext = compressed.name.split('.').pop() || 'jpg';
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('public-assets')
      .upload(fileName, compressed, { upsert: true, contentType: compressed.type });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('public-assets')
      .getPublicUrl(fileName);

    return `${publicUrl}?t=${Date.now()}`;
  },

  // ==========================
  // RECIPES
  // ==========================
  async upsertRecipe(payload: any): Promise<void> {
    const { error } = await supabase
      .from('recipes')
      .upsert(payload)
      .select();
    if (error) throw error;
  },

  async deleteRecipe(id: string): Promise<void> {
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id)
      .select();
    if (error) throw error;
  },

  // ==========================
  // ARTICLES
  // ==========================
  async upsertArticle(payload: any): Promise<void> {
    const { error } = await supabase
      .from('articles')
      .upsert(payload)
      .select();
    if (error) throw error;
  },

  async deleteArticle(id: string): Promise<void> {
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id)
      .select();
    if (error) throw error;
  },

  // ==========================
  // BANNERS
  // ==========================
  async upsertBanner(payload: any): Promise<void> {
    const { error } = await supabase
      .from('banners')
      .upsert(payload)
      .select();
    if (error) throw error;
  },

  async deleteBanner(id: string): Promise<void> {
    const { error } = await supabase
      .from('banners')
      .delete()
      .eq('id', id)
      .select();
    if (error) throw error;
  },

  // ==========================
  // FAQ
  // ==========================
  async upsertFAQ(payload: any): Promise<void> {
    const { error } = await supabase
      .from('faq')
      .upsert(payload)
      .select();
    if (error) throw error;
  },

  async deleteFAQ(id: string): Promise<void> {
    const { error } = await supabase
      .from('faq')
      .delete()
      .eq('id', id)
      .select();
    if (error) throw error;
  }
};
