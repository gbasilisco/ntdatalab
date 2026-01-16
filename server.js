var express = require('express');
var path = require('path');
var RateLimit = require('express-rate-limit');

var app = express();

const browserPath = path.join(__dirname, 'dist/nt-data-lab/browser');


// Rate limiter for SPA fallback to protect filesystem access
var spaLimiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 SPA fallback requests per windowMs
});

// Static files
app.use(express.static(browserPath));

// SPA fallback
app.get('*', spaLimiter, function (req, res) {
  res.sendFile(path.join(browserPath, 'index.html'));
});

var PORT = process.env.PORT || 8080;
app.listen(PORT, function () {
  console.log(`Server is running on port ${PORT}`);
});
