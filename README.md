# EventPulse – Responsive Event Management Website

EventPulse is a responsive, front-end event management website. Visitors can browse upcoming events, search and filter them by category, read event details, and register for an event through a validated form. Registrations are stored in the browser, so no backend is needed.

It was built as the **K Explore – Web Designing** assignment using only HTML5, CSS3 and vanilla JavaScript.

## Project Links

- **GitHub repository:** "https://github.com/sumit-yadav-dev/EventPulse"
- **Live website:** "https://eventpulse.sumit142392.workers.dev/"

## Features

**Browsing and discovery**
- Responsive layout for phones, tablets and desktops (CSS Grid, Flexbox and media queries), with a mobile hamburger menu.
- Six sample events across five categories: Tech, Music, Design, Business and Gaming.
- Events are listed in date order, and featured events carry a "Featured" badge.
- Live search by event title, venue or description.
- Category filter buttons, plus a "Reset Filters" option when nothing matches.
- Event details are shown in a popup (modal) window.

**Registration**
- Registration form with JavaScript validation:
  - Full name: at least 3 characters.
  - Email: must be a valid email format.
  - Phone: 10 digits (spaces and dashes are allowed).
- Duplicate protection: the same email cannot register twice for the same event.
- A confirmation screen with a generated ticket ID after registering.
- A "My Registrations" section where registered tickets can be viewed and cancelled.
- User-entered text is escaped before it is displayed, so it cannot inject HTML or scripts.

**Bonus features**
- Light and dark mode, remembered between visits.
- Live countdown (days, hours, minutes, seconds) to the next upcoming event.
- Local Storage for registrations and the theme choice, with safe handling if storage is unavailable.
- Hover effects, smooth transitions and a modal animation, which respect the "reduce motion" setting.

**Quality and accessibility**
- Skip link, keyboard-friendly menu and dialog (Escape to close, focus kept inside the dialog), and screen-reader announcements for search results and messages.
- Event images load lazily and fall back to a local placeholder if an online image fails to load.
- Favicon and page metadata (description, theme color, link-preview tags).

## Technologies Used

- **HTML5** – page structure and semantic elements
- **CSS3** – custom properties (variables), Grid, Flexbox, media queries, transitions
- **JavaScript (ES6+, vanilla)** – DOM handling, search/filter logic, form validation, countdown, Local Storage
- **Font Awesome 6.5.1 (Free)** – icons, loaded from a CDN
- **Google Fonts** – Plus Jakarta Sans, loaded from a CDN
- **Git and GitHub** – version control
- **Netlify, Vercel or GitHub Pages** – free static hosting

No frameworks, no build tools, no package installs and no backend.

## Folder Structure

```
EventPulse/
├── index.html              # Single-page website (all sections)
├── favicon.ico             # Browser tab icon (fallback)
├── README.md               # Project documentation
├── .gitignore              # Files Git should not track
├── css/
│   └── style.css           # All styles, light/dark themes and responsive rules
├── js/
│   ├── eventsData.js       # Sample event data
│   └── main.js             # Application logic (search, filters, modal, validation, countdown, storage)
└── images/
    ├── favicon.svg             # Tab icon for modern browsers
    ├── favicon-32x32.png       # PNG tab icon
    ├── apple-touch-icon.png    # iPhone/iPad home-screen icon
    └── event-placeholder.svg   # Shown if an event photo cannot load
```

## Running the Project Locally

No installation is needed.

1. Download or clone the project folder.
2. Open `index.html` in a modern browser (Chrome, Edge, Firefox or Safari).

Optionally, use the **Live Server** extension in VS Code: right-click `index.html` and choose **Open with Live Server**.

An internet connection is needed to show the event photos, icons and fonts, because they load from online services. The site still works without them, using the placeholder image and default fonts.

## Uploading to GitHub

You need a free [GitHub](https://github.com) account and [Git](https://git-scm.com/downloads) installed on your computer.

1. **Create an empty repository** on GitHub: click **New repository**, choose a name (for example `eventpulse`), and set it to **Public**. Do **not** tick "Add a README", "Add .gitignore" or "Add a license", because the project already has these files.
2. **Open a terminal in the project folder**, the one that contains `index.html`.
3. **Tell Git who you are** (only needed once per computer):
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"
   ```
4. **Create the repository and make the first commit:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: EventPulse event management website"
   git branch -M main
   ```
5. **Connect it to GitHub and push.** Replace the address with the one GitHub shows on your new repository's page:
   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
   git push -u origin main
   ```
   GitHub may ask you to sign in the first time.
6. Refresh the repository page and check that all the files and folders are there.

Later changes follow the same short routine:

```bash
git add .
git commit -m "Describe your change"
git push
```

**Optional:** the GitHub icon in the website footer (in `index.html`, inside the `social-icons` block) currently links to `#`. Replace `#` with your repository address, then commit and push again.

## Deployment

The project is a plain static site, so no build command is needed. Use the project's root folder, the one containing `index.html`, as the site root. Deploy only after the project is on GitHub, then add the live link to the Project Links section above.

### Netlify
1. Upload the project to GitHub (see the section above).
2. In Netlify, choose **Add new site → Import an existing project** and connect your GitHub repository.
3. Leave the build command empty and set the publish directory to the repository root.
4. Click **Deploy**. Netlify gives you a live URL.

### Vercel
1. Upload the project to GitHub (see the section above).
2. In Vercel, choose **Add New → Project** and import the repository.
3. Set the framework preset to **Other**, and leave the build command and output directory empty.
4. Click **Deploy**.

### GitHub Pages
1. Upload the project to GitHub (see the section above).
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, then select the `main` branch and the `/ (root)` folder.
4. Save. The site is published at your GitHub Pages URL after a short wait.

Menu names on these platforms can change slightly over time.

## Credits

- Event photos: [Unsplash](https://unsplash.com), loaded online from `images.unsplash.com`.
- Icons: [Font Awesome](https://fontawesome.com) Free.
- Font: [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) via Google Fonts.
- Event names, venues, prices and the hero statistics are sample content for demonstration only. The events are not real.
- Developed by: Sumit Kumar Yadav, for the K Explore – Web Designing assignment.
