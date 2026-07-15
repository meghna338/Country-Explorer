README
🌍 Atlas · Country Explorer
A clean, responsive web app to explore every country in the world — search by name and instantly see its flag, population, capital, region, and much more. Built with plain HTML, CSS, and JavaScript (no frameworks, no build step).
✨ Features
Search any country by name, official name, or capital
Country cards showing flag, capital, population, and region
Detail view with official name, subregion, area, population density, languages, currencies, bordering countries, top-level domain, and a map link
Filter by region and sort by name or population
Favorites — star countries and view them separately (saved between visits)
Dark / light theme toggle that remembers your choice
Responsive layout for desktop, tablet, and mobile
Keyboard accessible with graceful loading, empty, and error states
🎨 Design
Palette: ocean navy + teal, with a warm amber accent
Fonts: Plus Jakarta Sans (headings) + Inter (body)
🚀 Getting Started
No installation or build tools required.
Download or clone this repository.
Open index.html in any modern web browser.
That's it — the app loads country data automatically (an internet connection is required).
Deploy with GitHub Pages
Push these files to a GitHub repository.
Go to Settings → Pages.
Under Branch, select main and the /root folder, then Save.
Your app will be live at https://<your-username>.github.io/<repo-name>/.
📁 Project Structure
.
├── index.html    # Page structure
├── styles.css    # Styling, theming, responsive layout
├── app.js        # Data loading, search, filter, favorites, theme
└── README.md     # This file
​
🗂️ Data Sources
All data is free, CORS-enabled, and requires no API key:
Country details: mledoze/countries
Population: samayo/country-json
Flags: flagcdn.com
Note: This project originally targeted the REST Countries API, but its public keyless access was discontinued. The equivalent free sources above are used instead, so the app runs fully client-side with no key or backend.
🛠️ Built With
HTML5
CSS3 (custom properties, grid, flexbox)
Vanilla JavaScript (ES6+)
📄 License
Free to use and modify for personal and educational purposes.
