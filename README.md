# OTE data scraper and API

## Introduction
[OTE](https://www.ote-cr.cz/en) is an authority which publishes the electricity and gas market prices in Czechia. The purpose of this application is two-fold:
1. Scrape the market date from the [OTE](https://www.ote-cr.cz/en) web site and store the data in a database.
2. Provide API which enables to retrieve the data stored in a database, see the previous objective.
Each of these purposes is served by a dedicated module of this application described below.


## The data scraper module
The following paragraphs document the module dependencies and how the module is configured.

### Dependencies

| NPM package | Version | Comment                                       |
|-------------|---------|-----------------------------------------------|
| axios       | ^1.7.9  | To read the remote OTE web page.              |
| cheerio     | ^1.0.0  | To parse and scrape the remote OTE web page.  |
| dotenv      | ^16.4.7 | To read the environment variables.            |
| mongoose    | ^8.9.0  | To read from and write to a MongoDB database. |
| util        | ^0.12.5 |                                               |


### Configuration
It is possible to configure functionality of the module through the following constants in the module source code:
- `CONF_START_DATE` - The first date to scrape the data for.
- `CONF_PERIOD_IN_DAYS` - The number of days to scrape data for.
There is not any verification of these configuration parameters; this is a possible enhancement of this module.


## The OTE API module

## The data model
As it was mentioned above, the data scraper module uses a database to store the scraped data and the OTE API module uses the same database to provide the data through a REST API.

The database is MongoDB where the OTE market data for a single day is stores as a document of the `oteOneDay` model:

```javascript
const oteOneDaySchema = new mongoose.Schema({
    date: {
        type: mongoose.Schema.Types.Date,
        unique: true,
    },
    marketData: [
            Array
    ],
}, {
    methods: {
    },
});
export default mongoose.model('oteOneDay', oteOneDaySchema);
```

### A note about how dates are treated

## Possible use
The OTE API makes the data stored in the DB available through an API, so it can be used for other purposes, e.g. to visualize the data in [Looker Studio](https://lookerstudio.google.com).


