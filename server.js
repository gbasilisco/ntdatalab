var express = require('express');
var path = require('path');

var app = express();

const browserPath = path.join(__dirname, 'dist/nt-data-lab/browser');

// Static files
app.use(express.static(browserPath));

// SPA fallback
app.get('*', function (req, res) {
  res.sendFile(path.join(browserPath, 'index.html'));
});

var PORT = process.env.PORT || 8080;
app.listen(PORT, function () {
  console.log(`Server is running on port ${PORT}`);
});
