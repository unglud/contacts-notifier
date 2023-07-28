// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-brown; icon-glyph: magic;
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
        person.postalAddresses.some(address =>
            address.city !== targetCity
        ))

    return [peopleFromCity, peopleNotFromCity];
}

function separatePeopleByAlreadyContacted (people) {
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;  // Number of milliseconds in one week

    let peopleAlreadyContacted = people.filter(person =>
        person.dates.some(date =>
            date.label === 'Last contact' &&
            new Date() - new Date(date.value) > oneWeekInMs
        )
    );

    peopleAlreadyContacted.sort((a, b) => {
        const aDate = a.dates.find(date => date.label === 'Last contact').value;
        const bDate = b.dates.find(date => date.label === 'Last contact').value;

        return new Date(aDate) - new Date(bDate);
    });

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
    const now = new Date();//.toISOString();

    if (!dates.length) {
        return [{label: 'Last contact', value: now}];
    }
    return dates.map((date) => {
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
// 1. People from munich Without Last date
// if no such people, then
// 2. People from munich with last date

// Group 2
// 1. Without Last date
// if no such people, then
// 2. With a last date
const getContact = async (id) => {
    const containers = await ContactsContainer.all();
    const contacts = await Contact.all(containers);

    if (id) {
        return contacts.find((contact) => contact.identifier === id);
    }
    //log(contacts.length);

    const [peopleFromCity, peopleNotFromCity] = filterPeopleByCity(contacts, 'Munich');
    let pool = []
    if (Math.random() < 2 / 3) {
        pool = peopleFromCity;
    } else {
        pool = peopleNotFromCity;
    }

    let [peopleAlreadyContacted, peopleNeverContacted] = separatePeopleByAlreadyContacted(pool);
    // if there is no people from city left, take from outside
    if (peopleNeverContacted.length === 0){
        [peopleAlreadyContacted, peopleNeverContacted] = separatePeopleByAlreadyContacted(peopleNotFromCity);
    }

    let contact;
    if (peopleNeverContacted.length > 0) {
        contact = peopleNeverContacted[Math.floor(Math.random() * peopleNeverContacted.length)];
    } else {
        contact = peopleAlreadyContacted[0];
    }

    //log({dates: contact.dates, name: contact.givenName, address: contact.postalAddresses});

    return contact;
};

const spawnNotification = async (silent = false) => {
    await Notification.removeAllPending();
    const contact = await getContact();
    let name = getName(contact);
    const note = contact.note;
    const dates = `Last contact: ${getLastContact(contact.dates)}`;
    const body = `${note}\n${dates}`;

    notification = new Notification();
    const triggerDate = new Date();
    triggerDate.setSeconds(triggerDate.getSeconds() + 1);
    //notification.setTriggerDate(triggerDate);
    notification.setDailyTrigger(12, 0, true);
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




