// Wishes are saved to your Google Sheet through this URL.
window.INVITE_CONFIG = {
  sheetUrl: "https://script.google.com/macros/s/AKfycbx9Gib0gGrfJvE1aEpaNySOFV0kXzLXC51ntrOXq6T6Gtm6T0rl7P-NAl9hZU2rcmk/exec"
};

// Mobile wishes view: swipeable slider + "View all wishes" sheet.
(function () {
  var s = document.createElement("script");
  s.src = "wishes-mobile.js";
  s.defer = true;
  document.head.appendChild(s);
})();
