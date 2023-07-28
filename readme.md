# Scriptable Contacts Notifier

This project is a script for the iOS app Scriptable. Its purpose is to help you keep in touch with old contacts from your address book on a semi-random basis.

Every day at a certain time, you will receive a notification with the name of a person you should contact. Clicking on the notification will copy the name of the contact into your clipboard and open the Contacts App. You can then find this contact by pasting the name from your clipboard into the search bar of the Contacts App. Additionally, it will add a "Last contact" date to this contact for future reference.

## Installation

Before you begin, please note that Scriptable cannot open the Contacts App directly. Therefore, you need to create a shortcut in the Shortcuts App with the name "Open Contacts", where you need to add just one action: open Contacts App.

1. Download and install the [Scriptable](https://scriptable.app/) app on your iOS device.

2. Open the Scriptable app and create a new script.

3. Copy the JavaScript code provided and paste it into your new script.

4. Set the number of days that defines an "old" contact in the script. The script will filter out contacts based on this setting.

5. You may also want to set a specific city for the script to prioritize. The script will prioritize contacts from this city over other contacts.

6. Save and exit the script.

7. Go to your device settings and allow Scriptable to send notifications. This will enable the app to notify you about which contact to connect to.

8. Open the Shortcuts App and create a new shortcut named "Open Contacts". This shortcut should contain just one action: open Contacts App.

Now the script is ready to use!

## How It Works

The script uses the following principles to choose a contact:

1. Divide the people into two groups: people from a certain city (which you have defined in the script) and people from everywhere else. The city is identified from the contact's postal address, so make sure you update your contacts' city in your address book.

2. Randomly choose one of these two groups. The first group (people from the specified city) will appear twice as often.

3. Try to choose a random person from this group that you haven't contacted before. If such a person is not found, the script will choose the person that you haven't contacted for the longest time.

This way, the script helps you maintain a healthy and semi-random communication with your contacts.
