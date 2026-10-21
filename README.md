# Accreditation visit app

An offline iPad web app for on-site accreditation visits against the RACGP Standards for general practices (5th edition):

- **Health records review:** 5 records per GP, exported as a landscape A4 PDF
- **Equipment check:** doctor's bag, treatment room, and S8 medicines and samples
- **GP interview:** comments exported as a Word document
- **Exit interview:** an on-screen page read out at the end of the visit

Everything is saved on the iPad only. No patient names or identifiers are stored.

## Install on the iPad

Open the GitHub Pages link in Safari once, then tap Share → Add to Home Screen. Always open it from the home screen after that. It works offline, and Safari won't clear its saved data.

## Updating

This repository is a published copy of the `docs/` folder of the private source repository. Make changes there, then copy them here. Bump `CACHE` in `sw.js` with every change so iPads pick up the new version (it appears the second time the app is opened).
