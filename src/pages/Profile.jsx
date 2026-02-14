import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2, MessageCircle, Lock } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/apiUrl';
// @ts-ignore
import { Button } from '@/components/ui/button';
// @ts-ignore
import { Input } from '@/components/ui/input';
// @ts-ignore
import { Textarea } from '@/components/ui/textarea';
// @ts-ignore
import { Label } from '@/components/ui/label';
// @ts-ignore
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AvatarUpload from '@/components/profile/AvatarUpload';
import PhotoGallery from '@/components/profile/PhotoGallery';
import VideoGallery from '@/components/profile/VideoGallery';
import ReelGallery from '@/components/profile/ReelGallery';
// @ts-ignore
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
// @ts-ignore
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import BlockButton from '@/components/blocking/BlockButton';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [viewingUserEmail, setViewingUserEmail] = useState(null);
  const [showDuplicateError, setShowDuplicateError] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    age: '',
    gender: '',
    interested_in: '',
    interests: [],
    hobbies: '',
    looking_for: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    avatar_url: '',
    photos: [],
    videos: [],
    location: '',
    email_notifications_enabled: true
  });
  const queryClient = useQueryClient();

  const [backUrl, setBackUrl] = useState('Home');
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userParam = params.get('user');
    const backParam = params.get('back');
    const chatWithParam = params.get('chatWith');
    
    setViewingUserEmail(userParam);
    
    if (backParam) {
      // If coming from Chat and chatWith parameter exists, open that conversation
      if (backParam === 'Chat' && chatWithParam) {
        setBackUrl(backParam + `?user=${chatWithParam}&from=profile`);
      } else {
        setBackUrl(backParam);
      }
    }
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (err) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: myProfile, isLoading } = useQuery({
    queryKey: ['myProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
      return profiles[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: viewingProfile, isLoading: viewingLoading } = useQuery({
    queryKey: ['viewingProfile', viewingUserEmail],
    queryFn: async () => {
      if (!viewingUserEmail) return null;
      const profiles = await base44.entities.UserProfile.filter({ user_email: viewingUserEmail });
      return profiles[0] || null;
    },
    enabled: !!viewingUserEmail
  });

  const isOwnProfile = !viewingUserEmail || viewingUserEmail === user?.email;
  const displayProfile = isOwnProfile ? myProfile : viewingProfile;

  useEffect(() => {
    if (displayProfile) {
      setFormData({
        display_name: displayProfile.display_name || '',
        bio: displayProfile.bio || '',
        age: displayProfile.age || '',
        gender: displayProfile.gender || '',
        interested_in: displayProfile.interested_in || '',
        interests: displayProfile.interests || [],
        hobbies: displayProfile.hobbies || '',
        looking_for: displayProfile.looking_for || '',
        city: displayProfile.city || '',
        state: displayProfile.state || '',
        zip_code: displayProfile.zip_code || '',
        country: displayProfile.country || '',
        avatar_url: displayProfile.avatar_url || '',
        photos: displayProfile.photos || [],
        videos: displayProfile.videos || [],
        location: displayProfile.location || '',
        email_notifications_enabled: displayProfile.email_notifications_enabled !== false
      });
    } else if (user && isOwnProfile) {
      setFormData((prev) => ({
        ...prev,
        display_name: user.full_name || ''
      }));
    }
  }, [displayProfile, user, isOwnProfile]);

  const saveMutation = useMutation({
    mutationFn: async (formData) => {
      try {
        // Filter data to only include fields that exist in the database
        const validFields = [
          'display_name', 'bio', 'age', 'gender', 'interested_in',
          'interests', 'hobbies', 'looking_for', 'city', 'state', 'zip_code', 'country',
          'avatar_url', 'photos', 'videos', 'location', 'email_notifications_enabled'
        ];
        
        const data = Object.fromEntries(
          Object.entries(formData).filter(([key]) => validFields.includes(key))
        );
        
        console.log('📝 Saving profile with data:', data);
        
        // Always check for existing profile to handle race conditions
        const existingProfiles = await base44.entities.UserProfile.filter({ user_email: user.email });
        
        if (existingProfiles.length > 0) {
          // Update existing profile
          const result = await base44.entities.UserProfile.update(existingProfiles[0].id, data);
          return result;
        } else {
          // Create new profile
          const result = await base44.entities.UserProfile.create({
            user_email: user.email,
            ...data
          });
          return result;
        }
      } catch (error) {
        console.error('Profile save error:', error);
        throw error;
      }
    },
    onSuccess: async (result) => {
      // Invalidate and refetch queries
      await queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      await queryClient.invalidateQueries({ queryKey: ['viewingProfile'] });
      await queryClient.invalidateQueries({ queryKey: ['activeUsers'] });
      await queryClient.refetchQueries({ queryKey: ['myProfile', user?.email] });
      toast.success('Profile saved successfully!');
    },
    onError: (error) => {
      toast.error('Failed to save profile: ' + (error.message || 'Unknown error'));
      console.error('Save error:', error);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (myProfile) {
        await base44.entities.UserProfile.delete(myProfile.id);
      }
    },
    onSuccess: () => {
      toast.success('Account deleted successfully');
      setTimeout(() => {
        base44.auth.logout();
      }, 1000);
    },
    onError: () => {
      toast.error('Failed to delete account');
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const { currentPassword, newPassword, confirmPassword } = passwordForm;

      // Validation
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error('All fields are required');
      }

      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const response = await fetch(`${getApiBaseUrl()}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          currentPassword,
          newPassword
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to change password');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Password changed successfully!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowChangePasswordDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to change password');
    }
  });

  const handleSave = () => {
    // Validate required fields
    if (!formData.display_name || !formData.age || !formData.gender || !formData.interested_in || !formData.avatar_url || !formData.city || !formData.state || !formData.zip_code) {
      toast.error('Please complete all required fields (Display Name, Age, Gender, Interested In, Profile Picture, City, State, and ZIP Code)');
      return;
    }
    // Validate age requirement
    if (Number(formData.age) < 18) {
      toast.error('You must be at least 18 years old to create a profile');
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleDeleteAccount = () => {
    deleteMutation.mutate();
    setShowDeleteDialog(false);
  };

  const handleChangePassword = () => {
    changePasswordMutation.mutate();
  };

  if (!user || isLoading || viewingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-rose-50">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>);

  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50 pb-20">
      {/* Duplicate Profile Error Dialog */}
      <AlertDialog open={showDuplicateError} onOpenChange={setShowDuplicateError}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Profile Already Exists</AlertDialogTitle>
            <AlertDialogDescription>
              A profile already exists for this email address.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowDuplicateError(false)}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Your account and all associated data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowDeleteDialog(false)}>
              No
            </AlertDialogAction>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700">
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Password Dialog */}
      <AlertDialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Change Password</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="currentPassword" className="text-slate-700">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="••••••••"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="newPassword" className="text-slate-700">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-slate-700">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="mt-2"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => setShowChangePasswordDialog(false)}
              className="bg-slate-300 hover:bg-slate-400">
              Cancel
            </AlertDialogAction>
            <AlertDialogAction 
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending}
              className="bg-violet-600 hover:bg-violet-700">
              {changePasswordMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={createPageUrl(backUrl)}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">
            {isOwnProfile ? 'Edit Profile' : displayProfile?.display_name || 'Profile'}
          </h1>
          {isOwnProfile ? (
          <div className="flex flex-col items-center gap-1">
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-violet-600 hover:bg-violet-700 text-white">
                {saveMutation.isPending ?
              <Loader2 className="w-4 h-4 animate-spin" /> :

              <Save className="w-4 h-4" />
              }
              </Button>
            <span className="text-xs text-purple-600 font-medium">Save Profile</span>
          </div>
          ) : (
            <BlockButton 
              targetUserEmail={viewingUserEmail}
              currentUserEmail={user?.email}
              variant="destructive"
            />
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Avatar Section */}
        <motion.div
          className="flex justify-center mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}>

          {isOwnProfile ? (
          <AvatarUpload
            currentAvatar={formData.avatar_url}
            onAvatarChange={(url) => setFormData((prev) => ({ ...prev, avatar_url: url }))} />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl">
                <img
                  src={formData.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop'}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onContextMenu={(e) => e.preventDefault()}
                  draggable={false}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                />
              </div>
              <Link to={createPageUrl('Chat') + `?user=${viewingUserEmail}&from=profile&backTo=${backUrl}`}>
                <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Message
                </Button>
              </Link>
            </div>
          )}
        </motion.div>

        {/* Profile Form */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}>

          <h2 className="text-lg font-semibold text-slate-800 mb-4">Basic Info</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="display_name" className="text-slate-600">Display Name</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, display_name: e.target.value }))}
                placeholder="Your display name"
                className="mt-1 rounded-xl border-slate-200"
                disabled={!isOwnProfile} />

            </div>

            <div>
              <Label htmlFor="bio" className="text-slate-600">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell others about yourself..."
                className="mt-1 rounded-xl border-slate-200 resize-none"
                rows={3}
                disabled={!isOwnProfile} />

            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="age" className="text-slate-600">Age</Label>
                <Input
                  id="age"
                  type="number"
                  min="18"
                  value={formData.age}
                  onChange={(e) => setFormData((prev) => ({ ...prev, age: e.target.value || '' }))}
                  placeholder="Age"
                  className="mt-1 rounded-xl border-slate-200"
                  disabled={!isOwnProfile} />

              </div>

              <div>
                <Label className="text-slate-600">Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, gender: value }))}
                  disabled={!isOwnProfile}>

                  <SelectTrigger className="mt-1 rounded-xl border-slate-200">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non-binary">Non-binary</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-600">Interested In</Label>
                <Select
                  value={formData.interested_in}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, interested_in: value }))}
                  disabled={!isOwnProfile}>

                  <SelectTrigger className="mt-1 rounded-xl border-slate-200">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="men">Men</SelectItem>
                    <SelectItem value="women">Women</SelectItem>
                    <SelectItem value="transgender">Transgender</SelectItem>
                    <SelectItem value="everyone">Everyone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Interests Section */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}>

          <h2 className="text-lg font-semibold text-slate-800 mb-4">Interests & Preferences</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="interests" className="text-slate-600">Interests (Tags)</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {formData.interests && formData.interests.map((interest, idx) => (
                  <div key={idx} className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {interest}
                    {isOwnProfile && (
                      <button
                        onClick={() => setFormData((prev) => ({ 
                          ...prev, 
                          interests: prev.interests.filter((_, i) => i !== idx) 
                        }))}
                        className="hover:text-violet-900">
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {isOwnProfile && (
                <div className="flex gap-2 mt-2">
                  <Input
                    id="interests"
                    placeholder="Add interest (press Enter)"
                    className="mt-1 rounded-xl border-slate-200"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        setFormData((prev) => ({
                          ...prev,
                          interests: [...(prev.interests || []), e.currentTarget.value.trim()]
                        }));
                        e.currentTarget.value = '';
                      }
                    }}
                    disabled={!isOwnProfile} />
                  <Button
                    onClick={(e) => {
                      const button = e.currentTarget;
                      const input = button.parentElement?.querySelector('input');
                      if (input && input.value.trim()) {
                        setFormData((prev) => ({
                          ...prev,
                          interests: [...(prev.interests || []), input.value.trim()]
                        }));
                        input.value = '';
                      }
                    }}
                    className="bg-violet-600 hover:bg-violet-700 text-white">
                    Add
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="hobbies" className="text-slate-600">Hobbies</Label>
              <Textarea
                id="hobbies"
                value={formData.hobbies}
                onChange={(e) => setFormData((prev) => ({ ...prev, hobbies: e.target.value }))}
                placeholder="What do you like to do in your free time?"
                className="mt-1 rounded-xl border-slate-200 resize-none"
                rows={2}
                disabled={!isOwnProfile} />
            </div>

            <div>
              <Label htmlFor="looking_for" className="text-slate-600">Looking For</Label>
              <Textarea
                id="looking_for"
                value={formData.looking_for}
                onChange={(e) => setFormData((prev) => ({ ...prev, looking_for: e.target.value }))}
                placeholder="What kind of connection are you seeking?"
                className="mt-1 rounded-xl border-slate-200 resize-none"
                rows={2}
                disabled={!isOwnProfile} />
            </div>
          </div>
        </motion.div>

        {/* Location Section */}
        <motion.div
              className="bg-white rounded-2xl shadow-lg p-6 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}>

              <h2 className="text-lg font-semibold text-slate-800 mb-4">Location</h2>

              <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className="text-slate-600">City <span className="text-red-500">*</span></Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                    className="mt-1 rounded-xl border-slate-200"
                    disabled={!isOwnProfile} />
                </div>
                <div>
                  <Label htmlFor="state" className="text-slate-600">State <span className="text-red-500">*</span></Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                    placeholder="State"
                    className="mt-1 rounded-xl border-slate-200"
                    disabled={!isOwnProfile} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="zip_code" className="text-slate-600">ZIP Code <span className="text-red-500">*</span></Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, zip_code: e.target.value }))}
                    placeholder="ZIP Code"
                    className="mt-1 rounded-xl border-slate-200"
                    disabled={!isOwnProfile} />
                </div>
                <div>
                  <Label htmlFor="country" className="text-slate-600">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                    placeholder="Country"
                    className="mt-1 rounded-xl border-slate-200"
                    disabled={!isOwnProfile} />
                </div>
              </div>
              </div>
        </motion.div>

        {/* Media Galleries */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}>

          <Tabs defaultValue="photos" className="w-full">
            <TabsList className="w-full mb-4 bg-slate-100 rounded-xl p-1">
              <TabsTrigger value="photos" className="flex-1 rounded-lg data-[state=active]:bg-white">
                Photos
              </TabsTrigger>
              <TabsTrigger value="videos" className="flex-1 rounded-lg data-[state=active]:bg-white">
                Videos
              </TabsTrigger>
              <TabsTrigger value="reels" className="flex-1 rounded-lg data-[state=active]:bg-white">
                Reels
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="photos">
              <PhotoGallery
                photos={formData.photos}
                onPhotosChange={(photos) => setFormData((prev) => ({ ...prev, photos }))}
                editable={isOwnProfile} />

            </TabsContent>
            
            <TabsContent value="videos">
              <VideoGallery
                videos={formData.videos}
                onVideosChange={(videos) => setFormData((prev) => ({ ...prev, videos }))}
                editable={isOwnProfile} />

            </TabsContent>

            <TabsContent value="reels">
              <ReelGallery
                userEmail={viewingUserEmail}
                editable={isOwnProfile} />

            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Save Profile Button - Only for own profile */}
        {isOwnProfile && (
          <motion.div
            className="flex justify-center mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-3 text-lg rounded-xl">
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* Change Password Section - Only for own profile */}
        {isOwnProfile && (
          <motion.div
            className="bg-white rounded-2xl shadow-lg p-6 mt-6 border-2 border-violet-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}>
            <h2 className="text-lg font-semibold text-violet-600 mb-2 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Change Password
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              Update your password to keep your account secure.
            </p>
            <Button
              onClick={() => setShowChangePasswordDialog(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white">
              Change Password
            </Button>
          </motion.div>
        )}

        {/* Notification Preferences - Only for own profile */}
        {isOwnProfile && (
          <motion.div
            className="bg-white rounded-2xl shadow-lg p-6 mt-6 border-2 border-blue-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.37 }}>
            <h2 className="text-lg font-semibold text-blue-600 mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Notification Preferences
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-slate-700 font-medium">Email Notifications for Chat Messages</Label>
                <p className="text-sm text-slate-600 mt-1">
                  Receive email notifications when someone sends you a chat message
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.email_notifications_enabled}
                  onChange={(e) => setFormData({
                    ...formData,
                    email_notifications_enabled: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </motion.div>
        )}

        {/* Delete Account Section - Only for own profile */}
        {isOwnProfile && (
          <motion.div
            className="bg-white rounded-2xl shadow-lg p-6 mt-6 border-2 border-red-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}>
            <h2 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h2>
            <p className="text-sm text-slate-600 mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <Button
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteMutation.isPending}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700">
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Account'
              )}
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
}