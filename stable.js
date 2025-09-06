
<script>
function buildSelectorFromChain(selectorChain) {
  // "__" => descendant class, "___" => descendant tag
  return selectorChain
    .replace(/___/g, " ")
    .replace(/__([a-zA-Z0-9_-]+)/g, " .$1")
    .replace(/^([a-zA-Z][\w-]*)/, ".$1"); // ensure leading dot
}

function measure(targetEl, property) {
  if (!targetEl) return null;
  switch (property) {
    case "H": return targetEl.clientHeight + "px";
    case "W": return targetEl.clientWidth + "px";
    default:  return null;
  }
}

function setPageHeight() {
  const pg = document.getElementById("page");
  if (pg) pg.style.height = window.innerHeight + "px";
}

// Cache of { varName, selector, property, element }
const varBindings = new Map();

function init() {
  setPageHeight();

  const rx = /var\(\s*--([^)]+)\s*\)/g;

  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // skip CORS-protected stylesheets
    }
    if (!rules) continue;

    for (const rule of rules) {
      if (!rule?.style) continue;

      for (const prop of rule.style) {
        const value = rule.style.getPropertyValue(prop);
        if (!value) continue;

        let m;
        while ((m = rx.exec(value))) {
          const varName = m[1].trim();
          if (varBindings.has(varName)) continue; // already cached

          const [selectorChain, property] = varName.split("---");
          if (!selectorChain || !property) continue;

          const selector = buildSelectorFromChain(selectorChain);
          let el;
          try {
            el = document.querySelector(selector);
          } catch {
            el = null;
          }
          if (!el) continue;

          varBindings.set(varName, { selector, property, element: el });
        }
      }
    }
  }

  finalize(); // compute initial values
}

function finalize() {
  for (const [varName, { property, element }] of varBindings) {
    const val = measure(element, property);
    if (val) {
      document.documentElement.style.setProperty(`--${varName}`, val);
    }
  }
}

window.addEventListener("load", init);
window.addEventListener("resize", () => {
  setPageHeight();
  finalize();
});

// MutationObserver to watch for DOM changes
const observer = new MutationObserver(() => {
  finalize(); // recalc values when DOM changes
});

// Observe all subtree modifications inside <body>
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
});
</script>
