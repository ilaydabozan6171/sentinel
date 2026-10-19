(function () {
  // Mobile navigation
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // Availability heatmap: show day, period and value when hovering a cell
  var cells = document.querySelectorAll(".heat td[data-value]");
  if (cells.length) {
    var tip = document.createElement("div");
    tip.className = "heat-tip";
    tip.hidden = true;
    var tipValue = document.createElement("strong");
    var tipLabel = document.createElement("span");
    tip.appendChild(tipValue);
    tip.appendChild(tipLabel);
    document.body.appendChild(tip);

    cells.forEach(function (cell) {
      cell.addEventListener("pointermove", function (e) {
        tipValue.textContent = cell.dataset.value;
        tipLabel.textContent = cell.dataset.label;
        tip.hidden = false;
        var x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
        var y = e.clientY - tip.offsetHeight - 12;
        if (y < 8) y = e.clientY + 18;
        tip.style.left = x + "px";
        tip.style.top = y + "px";
      });
      cell.addEventListener("pointerleave", function () { tip.hidden = true; });
    });
  }
})();
