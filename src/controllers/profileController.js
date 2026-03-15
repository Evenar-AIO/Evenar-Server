const profileService = require("../services/profileService");

const getMe = async (req, res) => {
  try {
    const user = await profileService.getProfile(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Get profile successfully",
      data: user,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message || "Failed to get profile",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const updatedUser = await profileService.updateProfile(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update profile",
    });
  }
};

const updateOwnerProfile = async (req, res) => {
  try {
    const updatedUser = await profileService.updateOwnerProfile(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Owner profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update owner profile",
    });
  }
};

module.exports = {
  getMe,
  updateProfile,
  updateOwnerProfile,
};