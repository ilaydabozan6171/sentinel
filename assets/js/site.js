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

  // Project name pronunciation, always read with an English voice
  var sayBtn = document.querySelector(".say-btn");
  if (sayBtn) {
    if (!("speechSynthesis" in window)) {
      sayBtn.hidden = true;
    } else {
      // Natural-sounding voices first; macOS also ships joke voices (Albert, Zarvox, ...) to skip.
      var PREFERRED = ["Samantha", "Google US English", "Microsoft Aria", "Microsoft Jenny", "Microsoft Zira",
        "Microsoft Guy", "Microsoft David", "Alex", "Ava", "Allison", "Susan", "Tom", "Daniel", "Karen", "Moira"];
      var NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Junior|Kathy|Ralph|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|İyi Haber|Kötü Haber|Org)\b/i;
      var englishVoice = function () {
        var voices = window.speechSynthesis.getVoices().filter(function (v) { return /^en/i.test(v.lang); });
        for (var i = 0; i < PREFERRED.length; i++) {
          for (var j = 0; j < voices.length; j++) {
            if (voices[j].name.indexOf(PREFERRED[i]) === 0) return voices[j];
          }
        }
        var normal = voices.filter(function (v) { return !NOVELTY.test(v.name); });
        return normal.filter(function (v) { return /^en[-_]US/i.test(v.lang); })[0] || normal[0] || null;
      };
      window.speechSynthesis.getVoices(); // some browsers load the voice list on first call
      sayBtn.addEventListener("click", function () {
        var utterance = new SpeechSynthesisUtterance(sayBtn.dataset.say);
        utterance.lang = "en-US";
        var voice = englishVoice();
        if (voice) utterance.voice = voice;
        utterance.rate = 0.85;
        var done = function () { sayBtn.classList.remove("playing"); };
        utterance.onend = done;
        utterance.onerror = done;
        sayBtn.classList.add("playing");
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      });
    }
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
