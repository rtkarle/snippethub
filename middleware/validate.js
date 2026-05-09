// ─── Input Validation Middleware ─────────────────────────────────────────────

const validators = {
  register: (body) => {
    const errors = [];
    if (!body.username || body.username.trim().length < 3)
      errors.push('Username must be at least 3 characters.');
    if (!/^[a-zA-Z0-9_]+$/.test(body.username))
      errors.push('Username can only contain letters, numbers, and underscores.');
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))
      errors.push('Valid email is required.');
    if (!body.password || body.password.length < 6)
      errors.push('Password must be at least 6 characters.');
    return errors;
  },

  snippet: (body) => {
    const errors = [];
    if (!body.title || body.title.trim().length === 0)
      errors.push('Title is required.');
    if (body.title && body.title.length > 150)
      errors.push('Title must be under 150 characters.');
    if (!body.language)
      errors.push('Language is required.');
    if (!body.code || body.code.trim().length === 0)
      errors.push('Code is required.');
    return errors;
  }
};

function validate(type) {
  return (req, res, next) => {
    const errors = validators[type] ? validators[type](req.body) : [];
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }
    next();
  };
}

module.exports = validate;
