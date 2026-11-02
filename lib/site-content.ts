export const SITE_ORIGIN = "https://savvy.jeezlabs.io";
export const PRODUCT_TERMS = ["saved-place memory", "trip planning", "Taipei food guides"];
export const SITE_TITLE = "Savvy: Turn links into pins | Saved-place memory & trip planning";
export const SITE_DESCRIPTION = "Savvy is an iOS app for saved-place memory and trip planning. Keep source links, review possible places, and confirm what belongs on your map. Explore public Taipei food guides.";

// Shared by server-rendered HTML and Markdown so factual guidance stays aligned.
export const homeSections = [
  { heading: "Saved-place memory, from a link to your map", text: "Savvy helps you keep track of places you want to return to, from a restaurant post to a café mentioned by a friend. A saved link is a clue, not proof of a location. Keep the original source, check the place name and branch, and confirm the address before saving a Map Stamp. A possible match remains a Review Candidate until you decide it is the right place. If there is not enough information, keep the clue instead of guessing coordinates." },
  { heading: "Trip planning starts with places you confirmed", text: "Use your saved places as a starting point for a day out. Group nearby stops, leave room between activities, and keep a proposed plan editable. Planning a visit does not mean you have already visited, and a suggested place does not automatically become part of your saved memory. Check opening hours, current prices and travel conditions with the original source before setting out. Savvy is a place-memory app; the public website does not make reservations or purchases." },
  { heading: "Taipei food guides with sources", text: "The public metro map and station pages help you browse food ideas around Taipei MRT stops. The illustrated map is schematic, not a navigation map. Some map entries are labelled examples; sample prices and images do not establish a verified recommendation. Follow the source links on published entries and check the station food lists for their own disclosures. Reading a public guide does not add anything to your private map. The written guides explain how to preserve a source, handle ambiguous branches and start from your own confirmed places." },
  { heading: "Try Savvy, and keep control of your places", text: "The download links currently open the public iOS TestFlight invitation. Availability, compatible devices and the installed version are determined by Apple and the current test build. Free keeps 50 saved places; Pro allows unlimited saved places. AI is not a Pro-only feature. Guide steps can vary by test version. You do not need to upload private collections to this website to read the guides. For product background, help and agent-readable access, follow the About, Contact and Savvy API documentation links below." },
] as const;

export const infoPages = {
  about: {
    title: "About Savvy",
    description: "What Savvy does, how place clues become confirmed memory, and what the public website provides.",
    sections: [
      { heading: "A place-memory app", text: "Savvy is an iOS app for turning saved-place clues into user-confirmed place memory and trip planning. A social post or shared link can be a useful starting point, but it may omit the city, branch or address. The source remains a clue until there is enough evidence to review a possible place. Only the user's confirmation makes that place a Map Stamp in their saved memory." },
      { heading: "This public website", text: "The landing page introduces Savvy and links to the public iOS TestFlight invitation. The website also publishes Taipei metro food notes and Traditional Chinese guides about organizing restaurant links, reviewing imported places and planning from saved places. Public editorial notes and illustrated examples are separate from a user's private map. They do not prove that a user saved or visited a place." },
      { heading: "Your decision stays yours", text: "A proposed plan remains editable, and a recommendation is not a booking. Check current details with the original place or source before a trip. Free keeps 50 saved places and Pro allows unlimited saved places; AI is not a Pro-only feature. TestFlight availability and features depend on the current build. Visit Contact for help and Savvy API documentation for the website's read-only agent access." },
    ],
  },
  contact: {
    title: "Contact Savvy",
    description: "How to find Savvy support and report a problem with a public guide without sharing private place data.",
    sections: [
      { heading: "Find the right help", text: "Use the existing Savvy Support page for the published support channel and current TestFlight invitation. For an app issue, describe the action you tried, what you expected and what happened instead. Include the app version and device model when relevant. Public TestFlight availability is controlled by the invitation page; a link on this website does not guarantee an open testing slot." },
      { heading: "Report a public-content issue", text: "For a restaurant guide or metro food note, include the public page URL and the sentence or place that needs checking. A link to a current public source is more useful than a full export of your private collection. Opening hours, menus and prices can change, so confirm them with the original source before a visit. The illustrated metro map uses schematic positions and is not a navigation service." },
      { heading: "Share only what is needed", text: "Do not send passwords, access tokens, private trip links, full location histories or entire import archives in a support request. Use a short, redacted example if it explains the issue. Reading the public guides requires no upload of personal place data. This Contact page provides guidance and links; it does not submit a message or create a support ticket automatically." },
    ],
  },
  docs: {
    title: "Savvy API documentation and agent access",
    description: "Read-only HTTP access to Savvy's public landing page and guides, with Markdown negotiation and clear integration limits.",
    sections: [
      { heading: "When to use Savvy", text: "Use this site to explain Savvy's saved-place memory workflow, find source-aware place-organizing guides, or read public Taipei food notes. Keep clues, Review Candidates and confirmed Map Stamps distinct. A public food note is editorial content, not a saved or visited place in a user's account. Use the iOS app for user-confirmed place actions." },
      { heading: "Read the public website", text: "Start with GET https://savvy.jeezlabs.io/llms.txt or GET https://savvy.jeezlabs.io/sitemap.xml. Request the homepage or a listed public page with Accept: text/markdown for a Markdown response, or Accept: text/html for the browser page. Markdown responses include Vary: Accept. HTML and Markdown use private, no-store caching to prevent cross-format reuse. Unsupported media types receive 406; missing pages keep HTTP 404 and return a Markdown explanation when Markdown is requested. GET and HEAD are the supported reading methods." },
      { heading: "API, MCP, SDK and CLI availability", text: "This documentation covers the public website's read-only HTTP interface. There is no supported public account API, MCP server, SDK or CLI advertised by this landing site. Do not guess private endpoints, request account credentials, upload private collections, or claim you can save, confirm, delete, book or pay through these pages. This site does not authorize access to any user's private memory." },
      { heading: "Attribution and safe use", text: "Cite the canonical public page and retain source links and example disclosures. Do not infer exact coordinates from the schematic metro map. Guide steps are test-version references, not a promise that every TestFlight build has every feature. The website's code is maintained in the SAV-E-landing repository on GitHub; reading it does not turn internal app interfaces into supported public APIs." },
    ],
  },
} as const;

export const privacyGuidance = [
  { heading: "Reading the public website", text: "The landing page, written guides and metro food notes are public information. You can read them without uploading your saved places or import archives. An example restaurant or public source link is not a record of a user's saved or visited places. Follow source links with care: external sites have their own policies, and the TestFlight invitation is hosted by Apple." },
  { heading: "Keep support requests limited", text: "If you need help, describe the problem with a short, redacted example rather than a complete location history. Do not include passwords, access tokens, private trip links or an entire personal collection. This website's agent-readable pages provide the same public guidance as its HTML pages. They do not grant permission to read, change, share or delete anyone's private app data." },
] as const;
