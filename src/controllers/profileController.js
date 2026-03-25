const User = require('../models/User');

/**
 * @desc    Update user profile
 * @route   POST /api/profile/update
 * @access  Private
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.sub || req.user.id || req.user._id;
    const { 
      name, 
      fullName, 
      username, 
      phone, 
      phoneNumber, 
      avatar, 
      birthday, 
      gender, 
      address,
      description,
      companyName,
      contactInfo
    } = req.body;

    // Check if user tries to update email
    if (req.body.email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không được phép thay đổi địa chỉ email.' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy người dùng.' 
      });
    }

    // Update allowed fields
    // Mapping frontend names to backend model fields
    if (username) user.username = username;
    if (fullName) user.username = fullName; // if FE sends fullName, use it as username
    if (name) user.username = name;         // if FE sends name, use it as username
    
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (phone) user.phoneNumber = phone;
    
    if (avatar) user.avatar = avatar;
    if (birthday) user.birthday = birthday;
    if (gender) user.gender = gender;
    if (address) user.address = address;

    if (companyName) user.companyName = companyName;
    if (description) user.description = description;
    if (contactInfo) user.contactInfo = contactInfo;

    // Save and return
    const updatedUser = await user.save();
    
    // Convert to plain object and add fullName for frontend compatibility
    const userObj = updatedUser.toObject();
    const result = {
      ...userObj,
      id: userObj._id,
      fullName: userObj.username
    };

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin thành công.',
      data: result
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi hệ thống khi cập nhật thông tin.',
      error: error.message 
    });
  }
};
