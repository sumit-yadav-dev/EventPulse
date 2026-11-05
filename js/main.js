// EventPulse Main Application Controller

// ==========================================================================
// Stage A helpers: safe text, safe dates, safe Local Storage
// (These sit outside the main block so they stay small and easy to find.)
// ==========================================================================

// Local Storage key that holds the list of registrations
const REGISTRATIONS_KEY = 'event_registrations';

// Makes any text safe to place inside HTML.
// "<img src=x onerror=alert(1)>" becomes harmless text instead of a real tag.
function escapeHTML(value) {
    return String(value === null || value === undefined ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Turns "2026-11-20" into a Date at midnight in the visitor's OWN time zone.
// (new Date("2026-11-20") treats it as UTC, which shows the wrong day
//  for visitors in time zones behind UTC, such as the USA.)
function parseLocalDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

// ----- Stage B helpers: event start times, date order, "next upcoming" -----

// Reads the START time from text like "09:00 AM - 05:00 PM"  ->  { hours: 9, minutes: 0 }
// (If the text has no readable time, we fall back to midnight.)
function parseStartTime(timeText) {
    const match = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(String(timeText));
    if (!match) return { hours: 0, minutes: 0 };

    let hours = Number(match[1]) % 12;                 // 12 AM becomes 0, 12 PM becomes 0 (+12 below)
    if (match[3].toUpperCase() === 'PM') hours += 12;  // 07:00 PM -> 19
    return { hours: hours, minutes: Number(match[2]) };
}

// The exact moment an event starts (its date + its start time),
// in the visitor's own time zone.
function getEventStart(event) {
    const start = parseLocalDate(event.date);
    const time = parseStartTime(event.time);
    start.setHours(time.hours, time.minutes, 0, 0);
    return start;
}

// Use with .sort() to put events in date order, earliest first
function compareByStart(a, b) {
    return getEventStart(a) - getEventStart(b);
}

// Chooses the event for the hero countdown:
// the soonest upcoming FEATURED event, or - if no featured event is left -
// the soonest upcoming event of any kind. Returns null if nothing is upcoming.
function getNextUpcomingEvent(eventList, now = new Date()) {
    const upcoming = eventList
        .filter(event => getEventStart(event) > now)
        .sort(compareByStart);

    return upcoming.find(event => event.featured) || upcoming[0] || null;
}

// Local Storage can fail (private mode, blocked, storage full), so every
// read and write goes through these two functions instead of using it directly.
function storageGet(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn('Local Storage is not available for reading:', error);
        return null;
    }
}

function storageSet(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.warn('Local Storage is not available for saving:', error);
        return false;
    }
}

// Returns the saved registrations as an array. Always returns an array,
// even if nothing is saved or the saved data is damaged.
function getRegistrations() {
    const raw = storageGet(REGISTRATIONS_KEY);
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        // Keep only real registration objects (ignore anything unexpected)
        return parsed.filter(item => item && typeof item === 'object');
    } catch (error) {
        console.warn('Saved registrations are damaged and will be ignored:', error);
        return [];
    }
}

// Saves the list. Returns true if it worked, false if it failed.
function saveRegistrations(registrations) {
    return storageSet(REGISTRATIONS_KEY, JSON.stringify(registrations));
}

// True if this email is already registered for this event (ignores upper/lower case)
function isAlreadyRegistered(eventId, email) {
    const cleanEmail = String(email).trim().toLowerCase();
    return getRegistrations().some(reg =>
        reg.eventId === eventId &&
        String(reg.email || '').trim().toLowerCase() === cleanEmail
    );
}

// ==========================================================================
// Stage E: event images (fallback picture, responsive sizes)
// ==========================================================================

// Local picture shown when an external (Unsplash) photo cannot be loaded: offline, blocked, removed, slow network error...
const FALLBACK_IMAGE = 'images/event-placeholder.svg';

// Unsplash resizes photos on request through the "w=" part of the link. Giving the browser a small and a large
// version lets phones and small cards download a lighter picture instead of always the 800px one.
function responsiveImageAttrs(url, widths, sizes) {
    const safeUrl = escapeHTML(url);
    if (!/[?&]w=\d+/.test(url)) return `src="${safeUrl}"`;   // not a resizable link: use it as it is
    const srcset = widths
        .map(w => escapeHTML(url.replace(/([?&]w=)\d+/, '$1' + w)) + ' ' + w + 'w')
        .join(', ');
    const largest = widths[widths.length - 1];
    return `src="${escapeHTML(url.replace(/([?&]w=)\d+/, '$1' + largest))}" srcset="${srcset}" sizes="${sizes}"`;
}

// "error" events do not bubble, so this listens in the capture phase. It covers every image on the page, including
// the ones drawn later by the script (event cards, hero card, dialog). The flag stops an endless loop if the
// fallback file itself were ever missing.
document.addEventListener('error', (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || img.dataset.fallbackApplied) return;
    img.dataset.fallbackApplied = 'true';
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    img.classList.add('is-fallback');
    img.src = FALLBACK_IMAGE;
}, true);

// Remember which photos have arrived, so the soft placeholder colour (see CSS) is only shown while waiting.
// "load" does not bubble either, hence the capture phase again.
document.addEventListener('load', (e) => {
    if (e.target instanceof HTMLImageElement) e.target.classList.add('is-loaded');
}, true);

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const eventsGrid = document.getElementById('eventsGrid');
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');
    const categoryPills = document.querySelectorAll('.pill');
    const noEventsState = document.getElementById('noEventsState');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    const themeToggleBtn = document.getElementById('themeToggle');
    const hamburgerBtn = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    const heroCountdownCard = document.getElementById('heroCountdownCard');
    const registrationsList = document.getElementById('registrationsList');
    
    // Modal Elements
    const modal = document.getElementById('eventModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalBody = document.getElementById('modalBody');
    const toast = document.getElementById('toast');
    // Stage D: dialog box, screen-reader helpers, page areas that are switched off behind the dialog
    const modalContent = document.getElementById('modalContent');
    const liveRegion = document.getElementById('liveRegion');
    const resultsStatus = document.getElementById('resultsStatus');
    const pageAreas = document.querySelectorAll('header.navbar, main, footer');
    let lastFocusedElement = null;                              // what had focus before the dialog opened

    // Filter state
    let currentCategory = 'all';
    let searchQuery = '';

    // Stage B state (declared here, before initApp() runs below)
    let countdownTimer = null;                                  // the running countdown timer
    const sortedEvents = [...eventsData].sort(compareByStart);  // all events, earliest first

    // Initialize Application
    initApp();

    function initApp() {
        setupTheme();
        renderHeroFeaturedEvent();
        renderEvents();
        renderRegistrations();
    }

    // 1. Theme Toggle Management
    function setupTheme() {
        // Only accept "dark"; anything else (missing or unexpected) means "light"
        const savedTheme = storageGet('theme') === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }

    function updateThemeIcon(theme) {
        const icon = themeToggleBtn.querySelector('i');
        // Stage D: the button's name always says what it will do next
        themeToggleBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        if (theme === 'dark') {
            icon.className = 'fa-solid fa-sun';
        } else {
            icon.className = 'fa-solid fa-moon';
        }
    }

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        storageSet('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    // Mobile Menu Toggle
    // Stage C: one function opens or closes the mobile menu and keeps everything in sync
    const hamburgerIcon = hamburgerBtn.querySelector('i');
    hamburgerBtn.setAttribute('aria-controls', 'navLinks');

    function setMenuOpen(isOpen) {
        navLinks.classList.toggle('active', isOpen);
        document.body.classList.toggle('menu-open', isOpen);   // stops the page scrolling behind the menu
        hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
        hamburgerIcon.className = isOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';   // bars <-> X
    }
    setMenuOpen(false);

    hamburgerBtn.addEventListener('click', () => {
        setMenuOpen(!navLinks.classList.contains('active'));
    });

    // Close menu when link clicked
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            setMenuOpen(false);
        });
    });

    // Escape closes the menu and returns focus to the hamburger button
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navLinks.classList.contains('active')) {
            setMenuOpen(false);
            hamburgerBtn.focus();
        }
    });

    // If the window becomes wide (for example a tablet is rotated) while the menu is open, close it,
    // otherwise the page would stay locked from scrolling
    window.addEventListener('resize', () => {
        if (window.innerWidth > 900 && navLinks.classList.contains('active')) {
            setMenuOpen(false);
        }
    });

    // 2. Render Hero Countdown Featured Event
    function renderHeroFeaturedEvent() {
        const featuredEvent = getNextUpcomingEvent(eventsData);

        // Every event is in the past: show a simple message instead of a countdown
        if (!featuredEvent) {
            clearInterval(countdownTimer);
            heroCountdownCard.innerHTML = `
                <div class="preview-body">
                    <h3>No upcoming events</h3>
                    <p class="event-info">New events will be announced soon. Please check back later.</p>
                </div>
            `;
            return;
        }

        // A featured event gets the star; a regular "next" event gets a calendar icon
        const tagIcon = featuredEvent.featured ? 'fa-star' : 'fa-calendar-day';
        const tagText = featuredEvent.featured ? 'Featured Event' : 'Next Event';

        heroCountdownCard.innerHTML = `
            <div class="card-img-wrapper">
                <img ${responsiveImageAttrs(featuredEvent.image, [480, 800], '(max-width: 900px) 100vw, 460px')} alt="${featuredEvent.title}" width="800" height="400" loading="eager" decoding="async" fetchpriority="high">
                <span class="featured-tag"><i aria-hidden="true" class="fa-solid ${tagIcon}"></i> ${tagText}</span>
            </div>
            <div class="preview-body">
                <h3>${featuredEvent.title}</h3>
                <p class="event-info"><i aria-hidden="true" class="fa-solid fa-location-dot"></i> ${featuredEvent.venue}</p>
                <div class="countdown-container">
                    <span class="countdown-title"><i aria-hidden="true" class="fa-solid fa-clock"></i> Live Event Countdown</span>
                    <div class="timer-boxes" role="timer" aria-label="Time remaining until the event starts">
                        <div class="time-box"><span id="days">00</span><label>Days</label></div>
                        <div class="time-box"><span id="hours">00</span><label>Hours</label></div>
                        <div class="time-box"><span id="mins">00</span><label>Mins</label></div>
                        <div class="time-box"><span id="secs">00</span><label>Secs</label></div>
                    </div>
                </div>
                <button class="btn btn-primary" style="width:100%; margin-top:15px;" onclick="openModal('${featuredEvent.id}', this)" aria-label="Register now for ${escapeHTML(featuredEvent.title)}">Register Now</button>
            </div>
        `;

        startCountdown(getEventStart(featuredEvent));
    }

    // Counts down to the exact moment the event starts (a Date object)
    function startCountdown(startDate) {
        clearInterval(countdownTimer);   // never keep two timers running
        const targetTime = startDate.getTime();

        function updateTimer() {
            const distance = targetTime - new Date().getTime();

            // The event has started: stop this timer and show the next upcoming event
            if (distance <= 0) {
                clearInterval(countdownTimer);
                renderHeroFeaturedEvent();
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            const daysEl = document.getElementById('days');
            const hoursEl = document.getElementById('hours');
            const minsEl = document.getElementById('mins');
            const secsEl = document.getElementById('secs');

            if (daysEl) daysEl.innerText = days < 10 ? '0' + days : days;
            if (hoursEl) hoursEl.innerText = hours < 10 ? '0' + hours : hours;
            if (minsEl) minsEl.innerText = minutes < 10 ? '0' + minutes : minutes;
            if (secsEl) secsEl.innerText = seconds < 10 ? '0' + seconds : seconds;
        }

        updateTimer();
        countdownTimer = setInterval(updateTimer, 1000);
    }

    // 3. Render Events Grid with Filtering & Search
    function renderEvents() {
        const filteredEvents = sortedEvents.filter(event => {
            const matchesCategory = currentCategory === 'all' || event.category.toLowerCase() === currentCategory.toLowerCase();
            const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  event.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  event.description.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });

        // Stage D: tell screen-reader users how many events match
        resultsStatus.textContent = filteredEvents.length === 0
            ? 'No events found.'
            : filteredEvents.length + (filteredEvents.length === 1 ? ' event found.' : ' events found.');

        if (filteredEvents.length === 0) {
            eventsGrid.innerHTML = '';
            noEventsState.classList.remove('hidden');
        } else {
            noEventsState.classList.add('hidden');
            eventsGrid.innerHTML = filteredEvents.map(event => `
                <div class="event-card">
                    <div class="card-header">
                        <img ${responsiveImageAttrs(event.image, [400, 800], '(max-width: 640px) 100vw, 400px')} alt="${event.title}" width="800" height="400" loading="lazy" decoding="async">
                        <span class="category-badge">${event.category}</span>
                        ${event.featured ? '<span class="featured-tag"><i aria-hidden="true" class="fa-solid fa-star"></i> Featured</span>' : ''}
                    </div>
                    <div class="card-content">
                        <span class="event-date-pill"><i aria-hidden="true" class="fa-regular fa-calendar"></i> ${formatDate(event.date)}</span>
                        <h3 class="event-title">${event.title}</h3>
                        <div class="event-info"><i aria-hidden="true" class="fa-solid fa-location-dot"></i> ${event.venue}</div>
                        <p class="event-desc">${event.description}</p>
                        <div class="card-footer">
                            <span class="event-price">${event.price}</span>
                            <button class="btn btn-primary btn-sm" onclick="openModal('${event.id}', this)" aria-label="View details and register for ${escapeHTML(event.title)}">View & Register</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    function formatDate(dateStr) {
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return parseLocalDate(dateStr).toLocaleDateString('en-US', options);
    }

    // Event Listeners for Filters
    categoryPills.forEach(pill => {
        pill.addEventListener('click', () => {
            categoryPills.forEach(p => {
                p.classList.remove('active');
                p.setAttribute('aria-pressed', 'false');
            });
            pill.classList.add('active');
            pill.setAttribute('aria-pressed', 'true');
            currentCategory = pill.getAttribute('data-category');
            renderEvents();
        });
    });

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        renderEvents();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderEvents();
        searchInput.focus();   // Stage D: the clear button just disappeared, so keep keyboard focus somewhere useful
    });

    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        currentCategory = 'all';
        clearSearchBtn.style.display = 'none';
        categoryPills.forEach(p => {
            p.classList.remove('active');
            p.setAttribute('aria-pressed', 'false');
        });
        categoryPills[0].classList.add('active');
        categoryPills[0].setAttribute('aria-pressed', 'true');
        renderEvents();
        searchInput.focus();   // Stage D: the reset button just disappeared
    });

    // 4. Modal Window & Form Validation
    // openerElement is the button that was clicked (passed as "this" from the button).
    // Safari and Firefox on Mac do not give buttons focus when clicked, so document.activeElement alone is not enough.
    window.openModal = function(eventId, openerElement) {
        const event = eventsData.find(e => e.id === eventId);
        if (!event) return;

        lastFocusedElement = openerElement || document.activeElement;

        modalBody.innerHTML = `
            <div class="modal-hero">
                <img ${responsiveImageAttrs(event.image, [800], '(max-width: 800px) 100vw, 750px')} alt="${event.title}" width="800" height="400" decoding="async">
            </div>
            <div class="modal-inner">
                <span class="badge">${event.category}</span>
                <h2 id="modalTitle">${event.title}</h2>
                <p class="event-info"><i aria-hidden="true" class="fa-regular fa-calendar"></i> ${formatDate(event.date)} | ${event.time}</p>
                <p class="event-info"><i aria-hidden="true" class="fa-solid fa-location-dot"></i> ${event.venue}</p>
                <p style="margin-top:12px; color:var(--text-muted);">${event.description}</p>
                
                <form id="registrationForm" class="registration-form" novalidate>
                    <h3>Register for this Event</h3>
                    <input type="hidden" id="eventId" value="${event.id}">

                    <div class="form-group">
                        <label for="fullName">Full Name <span aria-hidden="true">*</span></label>
                        <div class="input-wrapper">
                            <i aria-hidden="true" class="fa-solid fa-user"></i>
                            <input type="text" id="fullName" class="form-control" placeholder="e.g. Alex Morgan" autocomplete="name" aria-describedby="nameError" aria-invalid="false" required>
                        </div>
                        <span class="error-message" id="nameError" role="alert">Please enter your full name (at least 3 characters).</span>
                    </div>

                    <div class="form-group">
                        <label for="email">Email Address <span aria-hidden="true">*</span></label>
                        <div class="input-wrapper">
                            <i aria-hidden="true" class="fa-solid fa-envelope"></i>
                            <input type="email" id="email" class="form-control" placeholder="alex@example.com" autocomplete="email" aria-describedby="emailError" aria-invalid="false" required>
                        </div>
                        <span class="error-message" id="emailError" role="alert">Please enter a valid email address.</span>
                    </div>

                    <div class="form-group">
                        <label for="phone">Phone Number <span aria-hidden="true">*</span></label>
                        <div class="input-wrapper">
                            <i aria-hidden="true" class="fa-solid fa-phone"></i>
                            <input type="tel" id="phone" class="form-control" placeholder="10-digit mobile number" autocomplete="tel" inputmode="tel" aria-describedby="phoneHint phoneError" aria-invalid="false" required>
                        </div>
                        <span class="sr-only" id="phoneHint">Enter 10 digits. Spaces and dashes are allowed.</span>
                        <span class="error-message" id="phoneError" role="alert">Please enter a valid 10-digit phone number.</span>
                    </div>

                    <div class="form-group">
                        <label for="eventTitle">Selected Event</label>
                        <div class="input-wrapper">
                            <i aria-hidden="true" class="fa-solid fa-ticket"></i>
                            <input type="text" id="eventTitle" class="form-control" value="${escapeHTML(event.title)}" title="${escapeHTML(event.title)}" readonly>
                        </div>
                    </div>

                    <button type="submit" class="btn btn-primary" style="width:100%;">Complete Registration</button>
                </form>
            </div>
        `;

        modalContent.scrollTop = 0;                 // a re-opened dialog always starts at the top
        modal.removeAttribute('inert');             // the closed dialog is inert (cannot be reached at all); wake it up
        lockPageScroll();
        modal.classList.add('active');
        document.body.classList.add('modal-open');  // stops the page scrolling behind the dialog
        setPageInert(true);                         // background can no longer be reached by keyboard or screen reader
        modalContent.focus({ preventScroll: true }); // screen readers announce the dialog name; Tab then starts at the X
        if (document.activeElement !== modalContent) {
            // Safety net: if the browser had not finished showing the dialog yet, try again on the next frame
            requestAnimationFrame(() => modalContent.focus({ preventScroll: true }));
        }
        setupFormValidation();
    };

    modalCloseBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Switches the page behind the dialog off (inert = no clicks, no Tab, hidden from screen readers)
    function setPageInert(isInert) {
        pageAreas.forEach(area => {
            if (isInert) {
                area.setAttribute('inert', '');
            } else {
                area.removeAttribute('inert');
            }
        });
    }

    // On computers with a normal scrollbar, hiding it widens the page by the scrollbar's width and everything jumps sideways.
    // We add that same width as padding while the dialog is open, so nothing moves. (Phones have no such scrollbar: width is 0.)
    function lockPageScroll() {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = scrollbarWidth + 'px';
            document.querySelector('.navbar').style.paddingRight = scrollbarWidth + 'px';
        }
    }

    function unlockPageScroll() {
        document.body.style.paddingRight = '';
        document.querySelector('.navbar').style.paddingRight = '';
    }

    function isModalOpen() {
        return modal.classList.contains('active');
    }

    function closeModal() {
        if (!isModalOpen()) return;
        modal.classList.remove('active');
        modal.setAttribute('inert', '');            // instantly unreachable, even while it fades out
        document.body.classList.remove('modal-open');
        unlockPageScroll();
        setPageInert(false);

        // Give focus back to the button that opened the dialog. If that button no longer exists
        // (for example the hero card was redrawn), use the hero button, then the main area.
        let target = lastFocusedElement;
        if (!target || !target.isConnected) {
            target = heroCountdownCard.querySelector('button') || document.getElementById('main-content');
        }
        lastFocusedElement = null;
        if (target && typeof target.focus === 'function') target.focus();
    }

    // Everything inside the dialog that the keyboard can reach, in order
    function getModalFocusables() {
        const selector = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        return Array.from(modalContent.querySelectorAll(selector))
            .filter(el => el.getClientRects().length > 0);
    }

    // Escape closes the dialog; Tab and Shift+Tab stay inside it (the "focus trap")
    document.addEventListener('keydown', (e) => {
        if (!isModalOpen()) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            closeModal();
            return;
        }

        if (e.key !== 'Tab') return;

        const focusables = getModalFocusables();
        if (focusables.length === 0) {
            e.preventDefault();
            modalContent.focus();
            return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        const focusIsInside = modalContent.contains(active);

        if (e.shiftKey && (active === first || active === modalContent || !focusIsInside)) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && (active === last || !focusIsInside)) {
            e.preventDefault();
            first.focus();
        }
    });

    // JavaScript Form Validation Engine
    // Stage D: LIVE validation. A field is checked when you leave it (blur). After that it is re-checked on every
    // keystroke, so an error disappears the moment you fix it. Submit checks every field and jumps to the first error.
    function setupFormValidation() {
        const form = document.getElementById('registrationForm');
        const nameInput = document.getElementById('fullName');
        const emailInput = document.getElementById('email');
        const phoneInput = document.getElementById('phone');
        const selectedEventId = document.getElementById('eventId').value;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^[0-9]{10}$/;

        // Each validator returns an error message, or '' when the value is fine
        function validateName() {
            const value = nameInput.value.trim();
            if (!value || value.length < 3) return 'Please enter your full name (at least 3 characters).';
            return '';
        }

        function validateEmail() {
            const value = emailInput.value.trim();
            if (!value) return 'Please enter your email address.';
            if (!emailRegex.test(value)) return 'Please enter a valid email address.';
            if (isAlreadyRegistered(selectedEventId, value)) return 'This email is already registered for this event.';
            return '';
        }

        function validatePhone() {
            const value = phoneInput.value.trim();
            if (!value) return 'Please enter your phone number.';
            if (!phoneRegex.test(value.replace(/[- ]/g, ''))) return 'Please enter a valid 10-digit phone number.';
            return '';
        }

        const fields = [
            { input: nameInput,  error: document.getElementById('nameError'),  validate: validateName,  touched: false },
            { input: emailInput, error: document.getElementById('emailError'), validate: validateEmail, touched: false },
            { input: phoneInput, error: document.getElementById('phoneError'), validate: validatePhone, touched: false }
        ];

        // Shows or clears the error for one field. Returns true when the field is valid.
        function checkField(field) {
            const message = field.validate();

            if (message) {
                field.input.classList.add('is-invalid');
                field.input.classList.remove('is-valid');
                field.input.setAttribute('aria-invalid', 'true');
                // Only write the text when it changed, so screen readers do not repeat the same message
                if (field.error.textContent !== message) field.error.textContent = message;
                field.error.classList.add('is-visible');      // the message is shown together with the red border
            } else {
                field.input.classList.remove('is-invalid');
                field.input.classList.add('is-valid');
                field.input.setAttribute('aria-invalid', 'false');
                field.error.classList.remove('is-visible');   // ...and hidden again as soon as the value is valid
            }
            return !message;
        }

        fields.forEach(field => {
            // Leaving the field: first check
            field.input.addEventListener('blur', () => {
                // Switching to another browser tab or window (or clicking the address bar) also fires "blur" on the focused
                // field, although the person has not left it. Only count it when focus really moved somewhere on this page.
                if (!document.hasFocus()) return;
                field.touched = true;
                checkField(field);
            });
            // Typing: re-check only once the field has been visited, so nobody sees errors while still typing the first time
            field.input.addEventListener('input', () => {
                if (field.touched) checkField(field);
            });
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            let firstInvalid = null;
            fields.forEach(field => {
                field.touched = true;
                if (!checkField(field) && !firstInvalid) firstInvalid = field.input;
            });

            // Send the keyboard / screen reader straight to the first problem (its error is read out with it)
            if (firstInvalid) {
                firstInvalid.focus();
                return;
            }

            const regData = {
                regId: 'TKT-' + Math.floor(100000 + Math.random() * 900000),
                eventId: document.getElementById('eventId').value,
                eventTitle: document.getElementById('eventTitle').value,
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                phone: phoneInput.value.trim(),
                timestamp: new Date().toLocaleString()
            };

            // Only confirm if the registration was really saved
            if (saveRegistration(regData)) {
                showConfirmation(regData);
                renderRegistrations();
                showToast("Registration Successful!");
            } else {
                showToast("Could not save your registration. Please check your browser's storage settings and try again.", true);
            }
        });
    }

    // LocalStorage Data Management
    // Returns true if saved, false if Local Storage failed
    function saveRegistration(data) {
        const registrations = getRegistrations();
        registrations.push(data);
        return saveRegistrations(registrations);
    }

    function showConfirmation(data) {
        modalBody.innerHTML = `
            <div class="modal-inner confirmation-card">
                <i aria-hidden="true" class="fa-solid fa-circle-check check-icon"></i>
                <h3 id="modalTitle" tabindex="-1">Registration Confirmed!</h3>
                <p>Thank you, <strong>${escapeHTML(data.name)}</strong>. Your ticket is confirmed.</p>

                <div class="ticket-summary">
                    <p><strong>Ticket ID:</strong> <span class="reg-id">${escapeHTML(data.regId)}</span></p>
                    <p><strong>Event:</strong> ${escapeHTML(data.eventTitle)}</p>
                    <p><strong>Registered Email:</strong> ${escapeHTML(data.email)}</p>
                    <p><strong>Phone:</strong> ${escapeHTML(data.phone)}</p>
                    <p><strong>Registered On:</strong> ${escapeHTML(data.timestamp)}</p>
                </div>

                <button type="button" class="btn btn-primary" id="confirmDoneBtn">Done</button>
            </div>
        `;

        // Stage D: "Done" closes through closeModal(), so scrolling, background and focus are all restored properly
        document.getElementById('confirmDoneBtn').addEventListener('click', closeModal);

        // The form (and the button that was focused) is gone, so move focus to the new heading
        document.getElementById('modalTitle').focus({ preventScroll: true });
        modalContent.scrollTop = 0;
    }

    // 5. Render Registered Events from LocalStorage
    function renderRegistrations() {
        const registrations = getRegistrations();
        
        if (registrations.length === 0) {
            registrationsList.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; padding:30px; color:var(--text-muted);">
                    <i aria-hidden="true" class="fa-solid fa-ticket" style="font-size:2rem; margin-bottom:10px;"></i>
                    <p>You haven't registered for any events yet. Pick an event above to get started!</p>
                </div>
            `;
            return;
        }

        registrationsList.innerHTML = registrations.map((reg, index) => `
            <div class="registration-card">
                <div>
                    <div class="reg-header">
                        <span class="reg-id">${escapeHTML(reg.regId)}</span>
                        <button class="btn btn-danger btn-sm" onclick="cancelRegistration(${index})" title="Cancel Registration" aria-label="Cancel registration ${escapeHTML(reg.regId)} for ${escapeHTML(reg.eventTitle)}"><i aria-hidden="true" class="fa-solid fa-trash"></i></button>
                    </div>
                    <h4>${escapeHTML(reg.eventTitle)}</h4>
                    <div class="reg-details" style="margin-top:10px;">
                        <p><i aria-hidden="true" class="fa-solid fa-user"></i> ${escapeHTML(reg.name)}</p>
                        <p><i aria-hidden="true" class="fa-solid fa-envelope"></i> ${escapeHTML(reg.email)}</p>
                        <p><i aria-hidden="true" class="fa-solid fa-phone"></i> ${escapeHTML(reg.phone)}</p>
                    </div>
                </div>
                <div style="margin-top:15px; font-size:0.75rem; color:var(--text-muted); border-top:1px solid var(--border-color); padding-top:8px;">
                    Registered: ${escapeHTML(reg.timestamp)}
                </div>
            </div>
        `).join('');
    }

    window.cancelRegistration = function(index) {
        if (confirm("Are you sure you want to cancel this registration?")) {
            const registrations = getRegistrations();
            registrations.splice(index, 1);

            if (saveRegistrations(registrations)) {
                renderRegistrations();
                showToast("Registration cancelled.");

                // Stage D: the clicked button was just removed, so put keyboard focus on a nearby button
                // (the next cancel button, or the previous one), or on the section heading when the list is empty
                const cancelButtons = registrationsList.querySelectorAll('.btn-danger');
                if (cancelButtons.length > 0) {
                    cancelButtons[Math.min(index, cancelButtons.length - 1)].focus();
                } else {
                    const heading = document.getElementById('registrations-heading');
                    heading.setAttribute('tabindex', '-1');
                    heading.focus();
                }
            } else {
                showToast("Could not cancel the registration. Please try again.", true);
            }
        }
    };

    // Pass true as the second value to show a red error toast
    // Stage D: the visible toast is hidden from screen readers; the message is read out through the live region instead
    function announce(message) {
        liveRegion.textContent = '';
        setTimeout(() => { liveRegion.textContent = message; }, 50);   // the short pause makes repeated messages read again
    }

    function showToast(message, isError = false) {
        announce(message);
        document.getElementById('toastMessage').innerText = message;
        document.getElementById('toastIcon').className = isError
            ? 'fa-solid fa-circle-exclamation'
            : 'fa-solid fa-circle-check';
        toast.style.background = isError ? '#ef4444' : '';
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
    // ==========================================================================
    // Stage D: correct active navbar link (click, footer / hero links, manual scrolling, back / forward)
    // ==========================================================================
    const navSections = Array.from(navLinks.querySelectorAll('.nav-link'))
        .map(link => ({ link: link, id: (link.getAttribute('href') || '').replace('#', '') }))
        .map(item => ({ link: item.link, id: item.id, section: document.getElementById(item.id) }))
        .filter(item => item.id && item.section);

    const navbarEl = document.querySelector('.navbar');
    let navLockId = null;        // set when a link was clicked: scrolling must not change the highlight until the user scrolls again
    let navLockSettledY = null;  // scroll position once the click's own scrolling has finished
    let navSettleTimer = null;
    let navTicking = false;

    function setActiveNav(id) {
        navSections.forEach(item => {
            const isActive = item.id === id;
            item.link.classList.toggle('active', isActive);
            if (isActive) {
                item.link.setAttribute('aria-current', 'location');
            } else {
                item.link.removeAttribute('aria-current');
            }
        });
    }

    // The section that is "current": the last one whose top has passed a line just below the navbar.
    // At the very bottom of the page the last section wins (it may be too short to ever reach that line).
    function getCurrentSectionId() {
        const line = navbarEl.offsetHeight + Math.min(150, window.innerHeight * 0.2);
        let currentId = navSections[0].id;

        navSections.forEach(item => {
            if (item.section.getBoundingClientRect().top <= line) currentId = item.id;
        });

        const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
        if (atBottom) currentId = navSections[navSections.length - 1].id;

        return currentId;
    }

    function releaseNavLock() {
        navLockId = null;
        navLockSettledY = null;
        clearTimeout(navSettleTimer);
    }

    function updateActiveNav() {
        navTicking = false;
        if (navLockId) return;
        setActiveNav(getCurrentSectionId());
    }

    // A link to a section was used: highlight it straight away and keep it highlighted while the page glides there.
    // This also fixes short sections near the bottom of the page, which the browser cannot scroll all the way up to.
    function lockNavTo(id) {
        navLockId = id;
        navLockSettledY = null;
        clearTimeout(navSettleTimer);
        setActiveNav(id);
    }

    function isNavSectionId(id) {
        return navSections.some(item => item.id === id);
    }

    // Any link that points at a tracked section: navbar, hero buttons, "Browse Events", footer links
    document.addEventListener('click', (e) => {
        const anchor = e.target.closest && e.target.closest('a[href^="#"]');
        if (!anchor) return;
        const id = anchor.getAttribute('href').slice(1);
        if (isNavSectionId(id)) lockNavTo(id);
    });

    // Browser Back / Forward between #sections
    window.addEventListener('hashchange', () => {
        const id = window.location.hash.slice(1);
        if (isNavSectionId(id)) lockNavTo(id);
    });

    window.addEventListener('scroll', () => {
        if (navLockId) {
            // While the clicked link's own scrolling is running, ignore it. Once it has stopped (no scroll for 120 ms),
            // remember where it stopped. If the user then scrolls away from that spot, hand control back to scrolling.
            if (navLockSettledY !== null && Math.abs(window.scrollY - navLockSettledY) > 30) {
                releaseNavLock();
            } else {
                clearTimeout(navSettleTimer);
                navSettleTimer = setTimeout(() => { navLockSettledY = window.scrollY; }, 120);
                return;
            }
        }
        if (!navTicking) {
            navTicking = true;
            window.requestAnimationFrame(updateActiveNav);
        }
    }, { passive: true });

    // The user takes over (mouse wheel, finger, scroll keys, dragging the scrollbar): stop holding the clicked link
    ['wheel', 'touchstart'].forEach(type => {
        window.addEventListener(type, releaseNavLock, { passive: true });
    });
    window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) releaseNavLock();
    });
    window.addEventListener('mousedown', (e) => {
        if (e.clientX >= document.documentElement.clientWidth) releaseNavLock();   // click on the scrollbar itself
    });

    window.addEventListener('resize', updateActiveNav);
    window.addEventListener('load', updateActiveNav);   // images finishing loading can move the sections
    updateActiveNav();                                  // correct highlight on first load, reload and #links
});
