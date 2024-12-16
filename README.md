# OTE data scraper and API

## Introduction
[OTE](https://www.ote-cr.cz/en) is an authority who publishes the electricity and gas market prices in Czechia. The purpose of this application is two-fold:
1. Scrape the market data from the [OTE](https://www.ote-cr.cz/en) web site and store the data in a database.
2. Provide a REST API interface which enables to retrieve the data stored in the database, see the previous objective.

Each of these purposes is served by a dedicated module of this application described below. Additionally, there is a section dedicated to the database data model. 


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

## The database data model
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

In the data model above, the `marketData` is a two dimensional array of numbers, where the first dimension represents one-hour-slots during a day. Normally, there are 24 entries in this dimension. However, there are two exceptions during a calendar year:
- On the day when the CET time zone transitions to the CEST time zone (23 entries).
- On the day when the CEST time zone transitions to the CET time zone (25 entries).

The second dimension represents different types of numerical data for the given one-hour slot:
- The first value is 0-based number of the one-hour slot.
- The second value is the electricity market price in `EUR/MWh` for the one-hour slot.
- The third value is the amount of electricity traded in `MWh` for the one-hour slot.
- The meaning of the fourth, five-th and sixth value is not perfectly clear to the author of this application.

### A note about how dates are treated

## Possible use of the application
The OTE API makes the data stored in the DB available through an API, so it can be used for other purposes, e.g. to visualize the data in [Looker Studio](https://lookerstudio.google.com).

## Disclaimer
### A note about using the scraper
A risk of generating a load which is higher then what the OTE infrastructure has been designed for. Use responsibly. 

**TODO**: see if there is a similar note for a similar piece of code.

## Deployment
1. Get MongoDB ready.

   1. Connect to MongoDB using `mongosh`.
   ```
   mongosh mongodb://<username>:<password>@<MongoDB IP address>:<port>
   ```
   
   2. Switch to the DB which you want to use for the application.
	  ```
		use <DB name>
		```

   3. Create a user with write access to the DB (take a note of the password so you can set the application environment variable later in the set up process).
	  ```javascript
		db.createUser({
			user: "<DB user>",
			pwd: passwordPrompt(),
			roles: [{role: "readWrite", db: "<DB user>"}]
		})
		```

2. Install the application.

   1. Using CLI, change to the directory of your choice.
   
   2. Clone the application repo.
	  ```
		git clone https://github.com/janspudich/OTE-data-scraper-and-API.git
		```

	**TODO**: Test the command above immediately after publishing this repo.

   3. Install the dependencies
	  ```
		npm install
		```

3. Configure the environment.

	In the project root directory, create a file `.env` and set the following variables in the file:

    | Variable name       | Variable value | Comment                                                     |
    |---------------------|----------------|-------------------------------------------------------------|
    | `OTE_BE_TUPLE_PORT` |                | A port on which the OTE API module listens for connections. |
    | `OTE_MONGO_SCHEMA`  | "mongodb"      | The MongoDB schema.                                         |
    | `OTE_MONGO_USER`    |                | The MongoDB user.                                           |
    | `OTE_MONGO_PASSW`   |                | The MongoDB user's password.                                |
    | `OTE_MONGO_IP`      |                | An IP address of the MongoDB server.                        |
    | `OTE_MONGO_PORT`    |                | A port of the MongoDB server.                               |
    | `OTE_MONGO_DB_NAME` |                | A name of the MongoDB database.                             |

4. Optional: configure the data scraper module, see [](###Configuration).

5. Run the data scraper module
   ```
	   node ./src/scraper.js 
	   ```

6. Run the OTE API module
   ```
	   node ./src/oteDataApi.js
	   ```
