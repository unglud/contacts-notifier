// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-brown; icon-glyph: magic;

// v1.4
// Some customisations
const timeoutDays = 30 // how many days to wait until this person will be chosen
const city = 'Munich' // Make people from this city a priority
const timeToTrigger = 12 // Hour of the day when to receive a notification

function formatDate (date) {
    const monthNames = [
        'January', 'February', 'March',
        'April', 'May', 'June', 'July',
        'August', 'September', 'October',
        'November', 'December'
    ];

    const day = date.getDate();
    const monthIndex = date.getMonth();
    const year = date.getFullYear();

    return day + ' ' + monthNames[monthIndex] + ' ' + year;
}

const log = (message) => {
    const alert = new Alert();
    if (typeof message === 'string' || message instanceof String) {
        alert.message = message;
    } else {
        alert.message = JSON.stringify(message, null, 2);
    }
    alert.present();
}

const filterPeopleByCity = (people, targetCity) =>{
    const peopleFromCity = people.filter(person =>
             person.postalAddresses.some(address =>
                address.city === targetCity
            ))

    const peopleNotFromCity = people.filter(person =>
        person.postalAddresses.every(address =>
            address.city !== targetCity
        ))

    //return [people,people];

    return [peopleFromCity, peopleNotFromCity];
}

// This function separates the input array of people into two groups:
// 1. those who have a "Last contact" date older than a specified number of days (peopleAlreadyContacted),
// 2. those who do not have a "Last contact" date (peopleAlreadyContacted).
// The function takes an array of people and a number of days as input, and returns an array of two arrays.

function separatePeopleByAlreadyContacted (people) {
    const msInOneDay = 24 * 60 * 60 * 1000;  // Number of milliseconds in one day
    const msOld = timeoutDays * msInOneDay;  // Number of milliseconds in the given number of days

    // Filter the people who have a "Last contact" date older than the specified number of days
    let peopleAlreadyContacted = people.filter(person =>
        person.dates.some(date =>
            date.label === 'Last contact' &&
            new Date() - new Date(date.value) > msOld
        )
    );

    // Sort the peopleAlreadyContacted array by the "Last contact" date
    // The person with the oldest "Last contact" date will be first
    peopleAlreadyContacted.sort((a, b) => {
        const aDate = a.dates.find(date => date.label === 'Last contact').value;
        const bDate = b.dates.find(date => date.label === 'Last contact').value;

        return new Date(aDate) - new Date(bDate);
    });

    // Filter the people who do not have a "Last contact" date
    const peopleNeverContacted = people.filter(person =>
        person.dates.every(date =>
            date.label !== 'Last contact'
        )
    );

    return [peopleAlreadyContacted, peopleNeverContacted];
}

const isLastContact = (label) => {
    return label === 'Last contact';
};

const getLastContact = (dates) => {
    const dateRecord = dates.find((date) => isLastContact(date.label));
    if (!dateRecord) {
        return 'never';
    }

    return formatDate(new Date(dateRecord.value));
};

const updateDate = (dates) => {
    const now = new Date();

    // Determine whether there's an object in dates with label === 'Last contact'
    const lastContactExists = dates.some(date => isLastContact(date.label));

    // If there's no object in dates with label === 'Last contact', create one
    if (!lastContactExists) {
        dates.push({label: 'Last contact', value: now});

        return dates;
    }

    // Update the value of the object in dates with label === 'Last contact'
    return dates.map(date => {
        if (isLastContact(date.label)) {
            date.value = now;
        }

        return date;
    });
};

const getName = (contact) => {
    let name = contact.givenName;
    if (contact.middleName) {
        name += ` ${contact.middleName}`;
    }

    if (contact.nickname) {
        name += ` "${contact.middleName}"`;
    }

    name += ` ${contact.familyName}`;

    if (contact.organizationName) {
        name += ` from ${contact.organizationName}`;
    }
    return name;
};

// Pick randomly group 1 or 2 (group 1 is 2x more often)

// Group 1
// 1. People from city Without Last date
// if no such people, then
// 2. People from city with Last date

// Group 2
// 1. Without Last date
// if no such people, then
// 2. With a Last date
const getContact = async (id) => {
    const containers = await ContactsContainer.all();
    const contacts = await Contact.all(containers);

    if (id) {
        return contacts.find((contact) => contact.identifier === id);
    }
    //log(contacts.length);

    let logData = {};

    const [peopleFromCity, peopleNotFromCity] = filterPeopleByCity(contacts, city);
    logData.contacts = {
        total: contacts.length,
        peopleFromCity: peopleFromCity.length,
        peopleNotFromCity: peopleNotFromCity.length
    };
    let pool;
    if (Math.random() < 2 / 3) {
        logData.random = "if";
        pool = peopleFromCity;
    } else {
        pool = peopleNotFromCity;
        logData.random = "else";
    }

    let [peopleAlreadyContacted, peopleNeverContacted] = separatePeopleByAlreadyContacted(pool);
    logData.pool = {
        total: pool.length,
        peopleAlreadyContacted: peopleAlreadyContacted.length,
        peopleNeverContacted: peopleNeverContacted.length
    };

    // if there is no people from city left, take from outside
    if (peopleNeverContacted.length === 0){
        logData.peopleNeverContactedIsZero = true;
        [peopleAlreadyContacted, peopleNeverContacted] = separatePeopleByAlreadyContacted(peopleNotFromCity);

        logData.peopleNotFromCity = {
            total: peopleNotFromCity.length,
            peopleAlreadyContacted: peopleAlreadyContacted.length,
            peopleNeverContacted: peopleNeverContacted.length
        };
    }

    let contact;
    if (peopleNeverContacted.length > 0) {
        logData.peopleNeverContactedIsGt = "if";
        contact = peopleNeverContacted[Math.floor(Math.random() * peopleNeverContacted.length)];
    } else {
        logData.peopleNeverContactedIsGt = "else";
        contact = peopleAlreadyContacted[0];
    }

    //log(logData);
    //log({dates: contact.dates, name: contact.givenName, address: contact.postalAddresses});

    return contact;
};

const spawnNotification = async (silent = false) => {
    await Notification.removeAllPending();
    const contact = await getContact();
    const name = getName(contact);
    const note = contact.note ? contact.note : '';
    const dates = `Last contact: ${getLastContact(contact.dates)}`;
    const body = `${note}\n${dates}`;

    /*log([name,body]);
    return;*/

    notification = new Notification();
    const triggerDate = new Date();
    triggerDate.setSeconds(triggerDate.getSeconds() + 1);
    //notification.setTriggerDate(triggerDate);
    notification.setDailyTrigger(timeToTrigger, 0, true);
    notification.title = `Time to connect with`;
    notification.subtitle = name;
    notification.body = body;
    notification.userInfo = {id: contact.identifier};
    notification.openURL = `scriptable:///run?scriptName=Connect`;

    await notification.schedule();
    if (!silent) {
        const alert = new Alert();
        const nextDate = formatDate(notification.nextTriggerDate);
        alert.message = `Next notification will be delivered ${nextDate}`;
        await alert.present();
    }
};

let notification = args.notification;
if (notification) {
    const id = notification.userInfo.id;
    const contact = await getContact(id);
    contact.dates = updateDate(contact.dates);

    const shortName = `${contact.givenName} ${contact.familyName}`;
    Pasteboard.copy(shortName);

    Contact.update(contact);
    await Contact.persistChanges();
    /*const alert = new Alert();
    alert.message = contact.givenName;
    await alert.present();*/
    await spawnNotification(true);

    await Safari.open(`shortcuts://run-shortcut?name=Open%20Contacts`);

} else {
    await spawnNotification();
}

Script.complete();




