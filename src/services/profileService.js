const User = require("../models/User");

// Lấy profile người dùng
const getProfile = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

// Update profile cho Customer
const updateProfile = async (userId, data) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  // chỉ update các field cần thiết
  if (data.name !== undefined) user.name = data.name;
  if (data.phone !== undefined) user.phone = data.phone;
  if (data.avatar !== undefined) user.avatar = data.avatar;
  if (data.birthday !== undefined) user.birthday = data.birthday;

  return await user.save();
};

// Update profile cho EventOwner
const updateOwnerProfile = async (userId, data) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (data.companyName !== undefined) user.companyName = data.companyName;
  if (data.description !== undefined) user.description = data.description;
  if (data.contactInfo !== undefined) user.contactInfo = data.contactInfo;
  if (data.phone !== undefined) user.phone = data.phone;

  return await user.save();
};

module.exports = {
  getProfile,
  updateProfile,
  updateOwnerProfile
};