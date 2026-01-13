/**
 * Permission Middleware
 * Usage: permit('quotation', 'create')
 */

const permission = (moduleName, action) => {
  return (req, res, next) => {
    try {
      const user = req.user;

      // Safety check
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Admin has full access
      if (user.role === 'admin') {
        return next();
      }

      // Check permission
      const allowed =
        user.permissions &&
        user.permissions[moduleName] &&
        user.permissions[moduleName][action];

      if (!allowed) {
        return res.status(403).json({
          message: 'You do not have permission to perform this action'
        });
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({ message: 'Permission check failed' });
    }
  };
};

module.exports = permission;
