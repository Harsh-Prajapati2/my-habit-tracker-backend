const User = require('../models/User');

const EMAIL_REGEX = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const ALLOWED_THEMES = ['light', 'dark'];
const ALLOWED_ACCENTS = ['indigo', 'cyan', 'emerald', 'rose'];
const ALLOWED_CARD_STYLES = ['glass', 'solid', 'outline'];

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    if (!STRONG_PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be 8+ chars and include at least 1 uppercase letter and 1 number',
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
    });

    // Generate token
    const token = user.generateToken();

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        theme: user.theme,
        accent: user.accent,
        habitCardStyle: user.habitCardStyle,
        notificationsEnabled: user.notificationsEnabled,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    // Check user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate token
    const token = user.generateToken();

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        theme: user.theme,
        accent: user.accent,
        habitCardStyle: user.habitCardStyle,
        notificationsEnabled: user.notificationsEnabled,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
const logout = async (req, res, next) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        theme: user.theme,
        accent: user.accent,
        habitCardStyle: user.habitCardStyle,
        notificationsEnabled: user.notificationsEnabled,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update current user profile/preferences
// @route   PATCH /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const updates = {};
    const { name, theme, accent, habitCardStyle, notificationsEnabled } = req.body;

    if (typeof name === 'string' && name.trim()) {
      updates.name = name.trim();
    }

    if (theme !== undefined) {
      if (!ALLOWED_THEMES.includes(theme)) {
        return res.status(400).json({ success: false, message: 'Theme must be light or dark' });
      }
      updates.theme = theme;
    }

    if (accent !== undefined) {
      if (!ALLOWED_ACCENTS.includes(accent)) {
        return res.status(400).json({ success: false, message: 'Accent must be indigo, cyan, emerald, or rose' });
      }
      updates.accent = accent;
    }

    if (habitCardStyle !== undefined) {
      if (!ALLOWED_CARD_STYLES.includes(habitCardStyle)) {
        return res.status(400).json({ success: false, message: 'habitCardStyle must be glass, solid, or outline' });
      }
      updates.habitCardStyle = habitCardStyle;
    }

    if (notificationsEnabled !== undefined) {
      if (typeof notificationsEnabled !== 'boolean') {
        return res.status(400).json({ success: false, message: 'notificationsEnabled must be boolean' });
      }
      updates.notificationsEnabled = notificationsEnabled;
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        theme: user.theme,
        accent: user.accent,
        habitCardStyle: user.habitCardStyle,
        notificationsEnabled: user.notificationsEnabled,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
};
