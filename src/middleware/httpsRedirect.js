/**
 * HTTPS redirect middleware (for deployments behind a proxy).
 * @returns {import('express').RequestHandler} Express middleware
 */
function createHttpsRedirect() {
  return (req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https' && req.hostname !== 'localhost') {
      return res.redirect(301, `https://${req.hostname}${req.url}`);
    }
    return next();
  };
}

module.exports = { createHttpsRedirect };
