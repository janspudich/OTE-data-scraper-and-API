# OTE data scraper and API

[OTE](https://www.ote-cr.cz/en) is an authority which publishes the electricity and gas market prices in Czechia.

The OTE data scraper retrieves the market data from the OTE web pages and stores the data in Mongo DB.

The OTE API makes the data stored in the DB available through an API, so it can be used for other purposes, e.g. to visualize the data in [Looker Studio](https://lookerstudio.google.com).
