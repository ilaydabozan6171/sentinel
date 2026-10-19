/**
 * Sentinel meeting scheduler (Google Apps Script web app).
 *
 * The website's Meetings page talks to this script:
 *   GET  ?action=config  -> quick-invite options and meeting types
 *   GET  ?action=list    -> every meeting created through the website
 *   POST {meeting}       -> creates a Google Calendar event with a Google Meet link
 *                           and emails the invitation to the team and any guests
 *
 * Setup steps are in the README (section "Toplantı planlayıcı").
 * The passcode is NOT stored in this file. It comes from secret.gs (not in the public repo,
 * see secret.example.gs) or from Project Settings -> Script Properties -> PASSCODE.
 */

const SETTINGS = {
  // Everyone here receives every invitation.
  TEAM_EMAILS: [
    'feyza.bahadirli@ug.bilkent.edu.tr',
    'tayyibe.ozkan@ug.bilkent.edu.tr',
    'ilayda.bozan@ug.bilkent.edu.tr',
    'efe.erdogmus@ug.bilkent.edu.tr',
  ],

  // Shown as tick boxes on the website. Only the labels are sent to the website.
  QUICK_INVITES: [
    { id: 'supervisor', label: 'Supervisor: Selim Aksoy', email: 'saksoy@cs.bilkent.edu.tr' },
    { id: 'instructor1', label: 'Instructor: Mert Bıçakçı', email: 'mert.bicakci@cs.bilkent.edu.tr' },
    { id: 'instructor2', label: 'Instructor: Hüseyin Açacak', email: 'huseyinacacak@bilkent.edu.tr' },
  ],

  MEETING_TYPES: ['Team', 'Supervisor', 'Instructor', 'EGM', 'Other'],

  CALENDAR_ID: 'primary',
  TIME_ZONE: 'Europe/Istanbul',
  TITLE_PREFIX: 'Sentinel: ',

  // The website lists meetings starting from this date (start of the semester).
  LIST_FROM: '2026-09-01',

  MAX_GUESTS: 10,
  MAX_MEETINGS_PER_DAY: 20,
  MAX_WRONG_PASSCODES_PER_DAY: 50,
};

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'list';
  try {
    if (action === 'config') return json_(getConfig_());
    if (action === 'list') return json_({ ok: true, meetings: listMeetings_() });
    return json_({ ok: false, error: 'Unknown action.' });
  } catch (err) {
    return json_({ ok: false, error: 'Could not load meetings: ' + err.message });
  }
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'The request could not be read.' });
  }

  const passcode = (typeof SCHEDULER_PASSCODE === 'string' && SCHEDULER_PASSCODE) ||
    PropertiesService.getScriptProperties().getProperty('PASSCODE');
  if (!passcode) return json_({ ok: false, error: 'The scheduler has no passcode set yet.' });
  if (tooManyWrongPasscodes_()) {
    return json_({ ok: false, error: 'Too many wrong passcodes today. Please try again tomorrow.' });
  }
  if (String(data.passcode || '') !== passcode) {
    countWrongPasscode_();
    return json_({ ok: false, error: 'Wrong passcode.' });
  }

  const problem = validate_(data);
  if (problem) return json_({ ok: false, error: problem });

  if (!underDailyLimit_()) {
    return json_({ ok: false, error: 'Daily limit reached. Please try again tomorrow.' });
  }

  try {
    return json_(createMeeting_(data));
  } catch (err) {
    return json_({ ok: false, error: 'Google Calendar refused the meeting: ' + err.message });
  }
}

function getConfig_() {
  return {
    ok: true,
    timeZone: SETTINGS.TIME_ZONE,
    types: SETTINGS.MEETING_TYPES,
    quickInvites: SETTINGS.QUICK_INVITES.map(function (q) { return { id: q.id, label: q.label }; }),
    maxGuests: SETTINGS.MAX_GUESTS,
  };
}

function listMeetings_() {
  const from = Utilities.parseDate(SETTINGS.LIST_FROM + ' 00:00', SETTINGS.TIME_ZONE, 'yyyy-MM-dd HH:mm');
  const to = new Date(from.getTime() + 400 * 24 * 60 * 60 * 1000);
  const meetings = [];
  let pageToken;
  do {
    const page = Calendar.Events.list(SETTINGS.CALENDAR_ID, {
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      timeZone: SETTINGS.TIME_ZONE,
      privateExtendedProperty: 'sentinel=1',
      maxResults: 250,
      pageToken: pageToken,
    });
    (page.items || []).forEach(function (ev) {
      if (ev.status === 'cancelled') return;
      const props = (ev.extendedProperties && ev.extendedProperties.private) || {};
      meetings.push({
        title: String(ev.summary || '').replace(SETTINGS.TITLE_PREFIX, ''),
        type: props.type || '',
        createdBy: props.createdBy || '',
        start: ev.start.dateTime || ev.start.date,
        end: ev.end.dateTime || ev.end.date,
        guests: (ev.attendees || []).length,
      });
    });
    pageToken = page.nextPageToken;
  } while (pageToken);
  return meetings;
}

function validate_(d) {
  const title = String(d.title || '').trim();
  if (!title || title.length > 120) return 'Please enter a title (up to 120 characters).';
  if (SETTINGS.MEETING_TYPES.indexOf(d.type) === -1) return 'Please choose a meeting type.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.date || ''))) return 'Please choose a date.';
  if (!/^\d{2}:\d{2}$/.test(String(d.time || ''))) return 'Please choose a start time.';
  const minutes = Number(d.duration);
  if (!(minutes >= 15 && minutes <= 240)) return 'Duration must be between 15 and 240 minutes.';
  const by = String(d.createdBy || '').trim();
  if (!by || by.length > 80) return 'Please enter your name.';
  if (String(d.agenda || '').length > 2000) return 'The agenda is too long (2000 characters at most).';

  const guests = Array.isArray(d.guests) ? d.guests : [];
  if (guests.length > SETTINGS.MAX_GUESTS) return 'At most ' + SETTINGS.MAX_GUESTS + ' extra emails.';
  for (let i = 0; i < guests.length; i++) {
    if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(String(guests[i]))) {
      return 'This email address is not valid: ' + guests[i];
    }
  }
  const quick = Array.isArray(d.quickInvites) ? d.quickInvites : [];
  const known = SETTINGS.QUICK_INVITES.map(function (q) { return q.id; });
  for (let j = 0; j < quick.length; j++) {
    if (known.indexOf(quick[j]) === -1) return 'Unknown invite option.';
  }

  const start = startDate_(d);
  if (isNaN(start.getTime())) return 'The date or time is not valid.';
  if (start.getTime() < Date.now() - 5 * 60 * 1000) return 'The meeting time is in the past.';
  return '';
}

function createMeeting_(d) {
  const start = startDate_(d);
  const end = new Date(start.getTime() + Number(d.duration) * 60 * 1000);
  const fmt = "yyyy-MM-dd'T'HH:mm:ss";

  const emails = {};
  SETTINGS.TEAM_EMAILS.forEach(function (m) { emails[m.toLowerCase()] = true; });
  SETTINGS.QUICK_INVITES.forEach(function (q) {
    if ((d.quickInvites || []).indexOf(q.id) !== -1) emails[q.email.toLowerCase()] = true;
  });
  (d.guests || []).forEach(function (g) { emails[String(g).trim().toLowerCase()] = true; });
  const attendees = Object.keys(emails).map(function (m) { return { email: m }; });

  const by = String(d.createdBy).trim();
  const agenda = String(d.agenda || '').trim();
  const description = (agenda ? agenda + '\n\n' : '') + 'Created by ' + by + ' on the Sentinel project website.';

  const event = Calendar.Events.insert({
    summary: SETTINGS.TITLE_PREFIX + String(d.title).trim(),
    description: description,
    start: { dateTime: Utilities.formatDate(start, SETTINGS.TIME_ZONE, fmt), timeZone: SETTINGS.TIME_ZONE },
    end: { dateTime: Utilities.formatDate(end, SETTINGS.TIME_ZONE, fmt), timeZone: SETTINGS.TIME_ZONE },
    attendees: attendees,
    guestsCanSeeOtherGuests: true,
    conferenceData: {
      createRequest: { requestId: Utilities.getUuid(), conferenceSolutionKey: { type: 'hangoutsMeet' } },
    },
    extendedProperties: { private: { sentinel: '1', type: d.type, createdBy: by } },
  }, SETTINGS.CALENDAR_ID, { conferenceDataVersion: 1, sendUpdates: 'all' });

  return {
    ok: true,
    title: String(d.title).trim(),
    start: event.start.dateTime,
    end: event.end.dateTime,
    meetLink: event.hangoutLink || '',
    invited: attendees.length,
  };
}

function startDate_(d) {
  return Utilities.parseDate(d.date + ' ' + d.time, SETTINGS.TIME_ZONE, 'yyyy-MM-dd HH:mm');
}

function underDailyLimit_() {
  const props = PropertiesService.getScriptProperties();
  const key = 'count_' + Utilities.formatDate(new Date(), SETTINGS.TIME_ZONE, 'yyyy-MM-dd');
  const count = Number(props.getProperty(key) || 0);
  if (count >= SETTINGS.MAX_MEETINGS_PER_DAY) return false;
  props.setProperty(key, String(count + 1));
  return true;
}

function wrongPasscodeKey_() {
  return 'wrong_' + Utilities.formatDate(new Date(), SETTINGS.TIME_ZONE, 'yyyy-MM-dd');
}

function tooManyWrongPasscodes_() {
  const count = Number(PropertiesService.getScriptProperties().getProperty(wrongPasscodeKey_()) || 0);
  return count >= SETTINGS.MAX_WRONG_PASSCODES_PER_DAY;
}

function countWrongPasscode_() {
  const props = PropertiesService.getScriptProperties();
  const key = wrongPasscodeKey_();
  props.setProperty(key, String(Number(props.getProperty(key) || 0) + 1));
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
