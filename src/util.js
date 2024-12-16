
export const dateToDateStr = function(date){
    const month = date.getMonth() + 1;
    const monthStr = (month<10) ? `0${month}` : `${month}`;

    const day = date.getDate();
    const dayStr = (day<10) ? `0${day}` : `${day}`;

    return `${date.getFullYear()}-${monthStr}-${dayStr}`;
};

export const mongoUrl = `${process.env.OTE_MONGO_SCHEMA}://${process.env.OTE_MONGO_USER}:${process.env.OTE_MONGO_PASSW}@${process.env.OTE_MONGO_IP}:${process.env.OTE_MONGO_PORT}/${process.env.OTE_MONGO_DB_NAME}`;

export const oteUrlBase = 'https://www.ote-cr.cz/cs/kratkodobe-trhy/elektrina/denni-trh?date=';
