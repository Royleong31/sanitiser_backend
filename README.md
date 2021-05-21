# Sanitiser Backend
- It is hosted on Firebase using Firebase Cloud Functions
- The code for the APIs are in the functions/index.js
- There are 2 APIs, 1 for resetting and 1 for indicating that a dispenser was used.
- As the gateway does not check if the dispenserId and companyId are valid, all the checks are done on the backend. Both APIs will reject the request if the companyId or dispenserId are incorrect
- More details on the specific workings of each API can be found in the comments in the code in the index.js file

## Database Architecture
- There are 3 main parties: Companies, Users, and dispensers.
- Each company has many dispensers
- Each company has many users 
- When dispenser is refilled/refill running low, notifications will be sent to the users that are registered to the same company as that dispenser


### Tables 
1) usageData
    Stores a new document every time dispensers are used or refilled
    Stores details of the dispenser, time, and the type of usage (whether is was used or refilled) 
    If dispenser was used, wasUsed == true, if dispenser was refilled, wasUsed == false
    
2) users
    
3) dispensers
4) companies

### Notifications
- Notifications are sent to relevant users only when they are currently logged in
- The device tokens of the logged in users are stored in the user document, and Firebase Cloud Messaging is used to send notifications to these users.
- 2 types of notifications: 
    1) Notify when refilled
    2) Notify when refill is running low (user can choose the refill level at which they want to be notified, from 5% -50%)

## Usage API
- The gateway/dispenser with WiFi will send API with the companyId, dispenserId and typeOfUsage.
- The database will be updated by adding a document to usageData and updating the dispenserLevel in the dispenser document
- The dispenserLevel will be checked against the refill level that the users in the company chose to receive notifications at (notificationLevel variable in user document)
    - If the dispenserLevel is below the notificationLevel, a notification will be sent to mobile apps that are currently logged into the same company that the dispenser belongs to.

## Reset API
- The database will be updated by adding a document to usageData and updating the dispenserLevel in the dispenser document
- A notification will be sent to mobile apps that are currently logged into the same company that the dispenser belongs to and indicated that they want to be notified when the dispenser is refilled. (notifyWhenRefilled == true)
    
