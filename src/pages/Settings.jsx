import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { uploadImageToCloudinary } from '../services/cloudinary';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

const Settings = () => {
  const [formData, setFormData] = useState({
    company_name: '',
    address: '',
    phone: '',
    gst_number: '',
    logo_url: ''
  });
  const [logoFile, setLogoFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsId, setSettingsId] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('settings').select('*').limit(1).single();
      if (data) {
        setFormData(data);
        setSettingsId(data.id);
      }
    } catch (error) {
      console.log('No existing settings found or error fetching');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let finalLogoUrl = formData.logo_url;
      if (logoFile) {
        toast.loading('Uploading logo...', { id: 'logoupload' });
        finalLogoUrl = await uploadImageToCloudinary(logoFile);
        toast.dismiss('logoupload');
      }

      const updateData = { ...formData, logo_url: finalLogoUrl, updated_at: new Date().toISOString() };

      if (settingsId) {
        const { error } = await supabase.from('settings').update(updateData).eq('id', settingsId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('settings').insert([updateData]);
        if (error) throw error;
      }
      toast.success('Settings saved successfully!');
      fetchSettings();
    } catch (error) {
      toast.error('Failed to save settings');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="max-w-3xl" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <h1 className="text-3xl font-bold text-gray-800 mb-8" style={{ fontFamily: "'Playfair Display', serif" }}>Settings</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-xl font-semibold mb-6 text-gray-800 border-b pb-4">Company Details</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Address</label>
              <textarea rows="3" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.gst_number} onChange={e => setFormData({...formData, gst_number: e.target.value})} />
            </div>
          </div>

          <div className="border-t pt-6 mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
            <div className="flex items-center space-x-6">
              <div className="h-24 w-24 bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center overflow-hidden">
                {formData.logo_url || logoFile ? (
                  <img src={logoFile ? URL.createObjectURL(logoFile) : formData.logo_url} alt="Logo Preview" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-gray-400 text-xs text-center border p-2">No Logo</span>
                )}
              </div>
              <input type="file" accept="image/*" className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={e => setLogoFile(e.target.files[0])} />
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t">
            <button type="submit" disabled={isSaving} className="bg-blue-600 text-white font-medium py-2 px-6 rounded-lg flex items-center hover:bg-blue-700 transition disabled:opacity-50">
              <Save size={20} className="mr-2" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
