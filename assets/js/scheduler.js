// Meeting calendar on the Meetings page. Talks to the Apps Script web app in _apps-script/Code.gs.
(function () {
  var root = document.getElementById("scheduler");
  if (!root) return;

  var endpoint = root.dataset.endpoint;
  var teamSize = Number(root.dataset.teamSize) || 0;
  var listBox = root.querySelector("[data-meeting-list]");
  var countTag = root.querySelector("[data-meeting-count]");
  var form = root.querySelector("[data-meeting-form]");
  var F = form.elements;
  var result = root.querySelector("[data-form-result]");
  var hint = root.querySelector("[data-availability-hint]");
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // "2026-12-01T14:30:00+03:00" -> parts in the meeting's own (Istanbul) time
  function parts(iso) {
    return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
  }
  function toDate(iso) {
    return new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + "+03:00");
  }

  // ---------- Meeting list ----------

  function renderMeetings(meetings) {
    listBox.textContent = "";
    countTag.hidden = false;
    countTag.textContent = meetings.length + (meetings.length === 1 ? " meeting" : " meetings");
    if (!meetings.length) {
      listBox.appendChild(el("p", "empty", "No meetings scheduled yet."));
      return;
    }
    var now = Date.now();
    var upcoming = meetings.filter(function (m) { return toDate(m.end).getTime() >= now; });
    var past = meetings.filter(function (m) { return toDate(m.end).getTime() < now; }).reverse();
    if (upcoming.length) listBox.appendChild(group("Upcoming", upcoming, true));
    if (past.length) listBox.appendChild(group("Past", past, false));
  }

  function group(title, meetings, upcoming) {
    var wrap = el("div", "meeting-group");
    wrap.appendChild(el("p", "meeting-group-title", title));
    var ul = el("ul", "meeting-list");
    meetings.forEach(function (m) {
      var s = parts(m.start), e = parts(m.end);
      var li = el("li", "meeting" + (upcoming ? " upcoming" : ""));
      var badge = el("span", "meeting-date");
      badge.appendChild(el("span", "day", s.date.slice(8, 10)));
      badge.appendChild(el("span", "month", MONTHS[Number(s.date.slice(5, 7)) - 1]));
      li.appendChild(badge);
      var body = el("div", "meeting-body");
      var head = el("div", "meeting-head");
      head.appendChild(el("span", "meeting-title", m.title));
      if (m.type) head.appendChild(el("span", "tag", m.type));
      body.appendChild(head);
      var meta = s.time + "–" + e.time + " · " + s.date.slice(0, 4);
      if (m.createdBy) meta += " · by " + m.createdBy;
      body.appendChild(el("span", "meeting-meta", meta));
      li.appendChild(body);
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    return wrap;
  }

  function loadMeetings() {
    fetch(endpoint + "?action=list")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.ok) throw new Error(data.error || "Could not load meetings.");
        renderMeetings(data.meetings || []);
      })
      .catch(function (err) {
        listBox.textContent = "";
        listBox.appendChild(el("p", "empty", "Meetings could not be loaded right now. " + err.message));
      });
  }

  function loadQuickInvites() {
    fetch(endpoint + "?action=config")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.needsPasscode) {
          root.querySelector("[data-passcode-field]").hidden = false;
          F.passcode.required = true;
        }
        var options = (data && data.quickInvites) || [];
        if (!options.length) return;
        var box = root.querySelector("[data-quick-invite-list]");
        options.forEach(function (q) {
          var label = el("label", "check");
          var input = el("input");
          input.type = "checkbox";
          input.name = "quickInvites";
          input.value = q.id;
          label.appendChild(input);
          label.appendChild(document.createTextNode(" " + q.label));
          box.appendChild(label);
        });
        root.querySelector("[data-quick-invites]").hidden = false;
      })
      .catch(function () { /* the form still works without quick invites */ });
  }

  // ---------- Availability hint ----------

  var availability = null;
  try {
    availability = JSON.parse(document.getElementById("availability-data").textContent);
  } catch (e) { availability = null; }

  function minutes(hhmm) {
    var p = hhmm.split(":");
    return Number(p[0]) * 60 + Number(p[1]);
  }

  function updateHint() {
    if (!availability || !availability.periods || !teamSize) return;
    var date = F.date.value, time = F.time.value;
    hint.hidden = true;
    if (!date || !time) return;
    var day = new Date(date + "T12:00:00").getDay(); // 1 = Monday ... 5 = Friday
    if (day < 1 || day > 5) return;
    var start = minutes(time), end = start + Number(F.duration.value);
    var lowest = null;
    availability.periods.forEach(function (p) {
      var range = p.time.split("–");
      var ps = minutes(range[0]), pe = minutes(range[1]) + 10; // a period runs until the next one starts
      if (ps < end && pe > start) {
        var n = p.free[day - 1];
        lowest = lowest === null ? n : Math.min(lowest, n);
      }
    });
    if (lowest === null) return;
    var level = Math.floor(lowest * 4 / teamSize);
    hint.textContent = "";
    hint.appendChild(el("span", "heat-dot lvl-" + level));
    var text = lowest === teamSize
      ? "Everyone is usually free at this time."
      : lowest + " of " + teamSize + " team members are usually free at this time.";
    hint.appendChild(document.createTextNode(text));
    hint.hidden = false;
  }

  ["date", "time", "duration"].forEach(function (name) {
    F[name].addEventListener("input", updateHint);
    F[name].addEventListener("change", updateHint);
  });

  // ---------- Create a meeting ----------

  var today = new Date();
  F.date.min = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");

  function showResult(kind, nodes) {
    result.className = "form-result " + kind;
    result.textContent = "";
    nodes.forEach(function (n) { result.appendChild(typeof n === "string" ? document.createTextNode(n) : n); });
    result.hidden = false;
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (!form.reportValidity()) return;

    var guests = F.guests.value.split(/[\s,;]+/).map(function (g) { return g.trim(); }).filter(Boolean);
    var bad = guests.filter(function (g) { return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g); });
    if (bad.length) { showResult("error", ["This email address is not valid: " + bad[0]]); return; }
    if (guests.length > 10) { showResult("error", ["Please add at most 10 extra emails."]); return; }

    var payload = {
      title: F.title.value.trim(),
      type: F.type.value,
      date: F.date.value,
      time: F.time.value,
      duration: Number(F.duration.value),
      createdBy: F.createdBy.value.trim(),
      quickInvites: Array.prototype.map.call(form.querySelectorAll("input[name=quickInvites]:checked"), function (c) { return c.value; }),
      guests: guests,
      agenda: F.agenda.value.trim(),
      passcode: F.passcode.value,
    };

    var button = form.querySelector("button[type=submit]");
    button.disabled = true;
    button.textContent = "Creating meeting…";
    result.hidden = true;

    // text/plain keeps the request "simple", so the browser does not need a CORS preflight.
    fetch(endpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.ok) throw new Error(data.error || "The meeting could not be created.");
        var s = parts(data.start), e = parts(data.end);
        var nodes = [el("strong", "", "Meeting created."), " " + data.title + ", " + s.date + " " + s.time + "–" + e.time + ". Invitations were emailed to " + data.invited + " people."];
        if (data.meetLink) {
          var link = el("a", "", data.meetLink);
          link.href = data.meetLink;
          link.target = "_blank";
          link.rel = "noopener";
          nodes.push(el("br"), "Google Meet: ", link);
        }
        showResult("success", nodes);
        F.title.value = "";
        F.agenda.value = "";
        F.guests.value = "";
        loadMeetings();
      })
      .catch(function (err) {
        showResult("error", [err.message]);
      })
      .then(function () {
        button.disabled = false;
        button.textContent = "Create meeting and send invitations";
      });
  });

  if (endpoint) {
    loadMeetings();
    loadQuickInvites();
  }
})();
