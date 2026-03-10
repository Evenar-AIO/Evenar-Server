const { profileUpdateSchema, ownerProfileUpdateSchema } = require('../validators/profileValidator');
const profileService = require('../services/profileService');

async function updateProfile(req, res, next) {
  try {
    const { error, value } = profileUpdateSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ success: false, message: error.details.map((x) => x.message).join(', ') });
    }

    const profile = profileService.updateProfile(req.user.id, value);
    return res.status(200).json({ success: true, data: profile, message: 'Profile updated successfully' });
  } catch (err) {
    return next(err);
  }
}

async function updateOwnerProfile(req, res, next) {
  try {
    const { error, value } = ownerProfileUpdateSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ success: false, message: error.details.map((x) => x.message).join(', ') });
    }

    const profile = profileService.updateProfile(req.user.id, value);
    return res.status(200).json({ success: true, data: profile, message: 'Owner profile updated successfully' });
  } catch (err) {
    return next(err);
  }
}

async function getMyProfile(req, res, next) {
  try {
    const profile = profileService.getProfile(req.user.id);
    return res.status(200).json({ success: true, data: profile });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  updateProfile,
  updateOwnerProfile,
  getMyProfile,
};
