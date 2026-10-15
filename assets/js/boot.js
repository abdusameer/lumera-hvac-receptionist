// Runs before first paint: marks that scripts run, and whether motion is welcome.
(function (d) {
  var c = d.documentElement.classList;
  c.add('js');
  try {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) c.add('motion');
  } catch (e) { /* no matchMedia: stay static */ }
})(document);
