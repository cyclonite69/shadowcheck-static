/**
 * Security headers middleware.
 * @param {boolean} forceHttps - Whether HTTPS is enforced
 * @returns {import('express').RequestHandler} Express middleware
 */
function createSecurityHeaders(forceHttps) {
  return (req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (forceHttps) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://api.mapbox.com; " +
        "worker-src 'self' blob:; " +
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com https://api.mapbox.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' https://api.mapbox.com https://*.tiles.mapbox.com https://events.mapbox.com https://d1a3f4spazzrp4.cloudfront.net;"
    );
    next();
  };
}

module.exports = { createSecurityHeaders };
