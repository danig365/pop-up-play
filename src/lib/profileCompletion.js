function hasText(value) {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

function hasProfilePhoto(profile) {
  if (!profile) return false;

  const hasAvatar = hasText(profile.avatar_url);
  const hasGalleryPhoto = Array.isArray(profile.photos) && profile.photos.some((item) => hasText(item));

  return hasAvatar || hasGalleryPhoto;
}

export function getMissingRequiredProfileFields(profile) {
  const missing = [];

  if (!hasText(profile?.display_name)) missing.push('display name');
  if (!hasText(profile?.zip_code)) missing.push('ZIP code');
  if (!hasText(profile?.gender)) missing.push('gender');
  if (!hasText(profile?.interested_in)) missing.push('interested in');

  const parsedAge = Number(profile?.age);
  if (!Number.isFinite(parsedAge) || parsedAge < 18) missing.push('age (18+)');

  if (!hasProfilePhoto(profile)) missing.push('profile photo');

  return missing;
}

export function isRequiredProfileComplete(profile) {
  return getMissingRequiredProfileFields(profile).length === 0;
}
