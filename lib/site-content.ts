export const SITE_ORIGIN = "https://savvy.jeezlabs.io";
export const PRODUCT_TERMS = [
  "place memory",
  "saved places",
  "map pins",
  "links to pins",
  "Taipei MRT food",
  "地點記憶",
  "收藏地點",
  "地圖圖釘",
  "台北捷運美食",
];
export const SCHEMA_DESCRIPTION =
  "Savvy turns links into places on your map. Confirm the spot, then stamp it — place memory, not navigation.";

export const infoPages = {
  about: {
    title: "About Savvy",
    description: "What Savvy does, how place clues become confirmed memory, and what the public website provides.",
    sections: [
      { heading: "A place-memory app", text: "Savvy is an iOS app for place memory. Save a link, confirm the spot, and stamp it on your map. A social post or shared link can be a useful starting point, but it may omit the city, branch or address. The source remains a clue until there is enough evidence to review a possible place. Only the user's confirmation makes that place a Map Stamp in their saved memory." },
      { heading: "This public website", text: "The landing page introduces Savvy and links to the public iOS TestFlight invitation. The website also publishes Taipei metro food notes and Traditional Chinese guides about organizing restaurant links, reviewing imported places, and listing confirmed places you want to visit next. Public editorial notes and illustrated examples are separate from a user's private map. They do not prove that a user saved or visited a place." },
      { heading: "Your decision stays yours", text: "A list of places stays editable, and a suggestion is not a booking. Check current details with the original place or source before you go. Free keeps 50 saved places and Pro allows unlimited saved places; AI is not a Pro-only feature. TestFlight availability and features depend on the current build. Visit Contact for help and Savvy API documentation for the website's read-only agent access." },
    ],
  },
  contact: {
    title: "Contact Savvy",
    description: "How to find Savvy support and report a problem with a public guide without sharing private place data.",
    sections: [
      { heading: "Find the right help", text: "Use the existing Savvy Support page for the published support channel and current TestFlight invitation. For an app issue, describe the action you tried, what you expected and what happened instead. Include the app version and device model when relevant. Public TestFlight availability is controlled by the invitation page; a link on this website does not guarantee an open testing slot." },
      { heading: "Report a public-content issue", text: "For a restaurant guide or metro food note, include the public page URL and the sentence or place that needs checking. A link to a current public source is more useful than a full export of your private collection. Opening hours, menus and prices can change, so confirm them with the original source before a visit. The illustrated metro map uses schematic positions and is not a navigation service." },
      { heading: "Share only what is needed", text: "Do not send passwords, access tokens, private place links, full location histories or entire import archives in a support request. Use a short, redacted example if it explains the issue. Reading the public guides requires no upload of personal place data. This Contact page provides guidance and links; it does not submit a message or create a support ticket automatically." },
    ],
  },
  docs: {
    title: "Savvy API documentation and agent access",
    description: "Read-only HTTP access to Savvy's public landing page and guides, with Markdown negotiation and clear integration limits.",
    sections: [
      { heading: "When to use Savvy", text: "Use this site to explain Savvy's place-memory workflow, find source-aware place-organizing guides, or read public Taipei food notes. Keep clues, Review Candidates and confirmed Map Stamps distinct. A public food note is editorial content, not a saved or visited place in a user's account. Use the iOS app for user-confirmed place actions." },
      { heading: "Read the public website", text: "Start with GET https://savvy.jeezlabs.io/llms.txt or GET https://savvy.jeezlabs.io/sitemap.xml. Request the homepage or a listed public page with Accept: text/markdown for a Markdown response, or Accept: text/html for the browser page. Markdown responses include Vary: Accept. HTML and Markdown use private, no-store caching to prevent cross-format reuse. Unsupported media types receive 406; missing pages keep HTTP 404 and return a Markdown explanation when Markdown is requested. GET and HEAD are the supported reading methods." },
      { heading: "API, MCP, SDK and CLI availability", text: "This documentation covers the public website's read-only HTTP interface. There is no supported public account API, MCP server, SDK or CLI advertised by this landing site. Do not guess private endpoints, request account credentials, upload private collections, or claim you can save, confirm, delete, book or pay through these pages. This site does not authorize access to any user's private memory." },
      { heading: "Attribution and safe use", text: "Cite the canonical public page and retain source links and example disclosures. Do not infer exact coordinates from the schematic metro map. Guide steps are test-version references, not a promise that every TestFlight build has every feature. The website's code is maintained in the SAV-E-landing repository on GitHub; reading it does not turn internal app interfaces into supported public APIs." },
    ],
  },
} as const;

export const privacyGuidance = [
  { heading: "Reading the public website", text: "The landing page, written guides and metro food notes are public information. You can read them without uploading your saved places or import archives. An example restaurant or public source link is not a record of a user's saved or visited places. Follow source links with care: external sites have their own policies, and the TestFlight invitation is hosted by Apple." },
  { heading: "Keep support requests limited", text: "If you need help, describe the problem with a short, redacted example rather than a complete location history. Do not include passwords, access tokens, private place links or an entire personal collection. This website's agent-readable pages provide the same public guidance as its HTML pages. They do not grant permission to read, change, share or delete anyone's private app data." },
] as const;
