# Sanitiser Backend
- The code for the APIs are in the functions/index.js
- There are 2 APIs, 1 for resetting and 1 for indicating that a dispenser was used.
- As the gateway does not check if the dispenserId and companyId are valid, all the checks are done on the backend. Both APIs will reject the request if the companyId or dispenserId are incorrect
- More details on the specific workings of each API can be found in the comments in the code in the index.js file
- It uses a serverless architecture using Firebase Cloud Functions, Firebase Firestore and Firebase Cloud Messaging

## Database Architecture
- There are 3 main groups: Companies, Users, and dispensers.
- Each company has many dispensers
- Each company has many users 

### Tables 
1) usageData
    - Stores a new document every time dispensers are used or refilled
    - Stores dispenserId (STRING), companyId (STRING), timeStamp (STRING) and wasUsed (BOOL)
    - If dispenser was used, wasUsed == true, if dispenser was refilled, wasUsed == false
    - timeStamp is stored in ISO format
    
2) users
    - Stores 1 document per user
    - Stores companyId (STRING), email (STRING), name (STRING), notificationLevel (NUMBER), notifyWhenRefilled (BOOL), deviceTokens (STRING[]) and userId (STRING)
    - notifyWhenRefiled, notificationLevel determine when the notifications will be sent
    - deviceTokens store an array of the devices that the user is logged in to. Relevant notifications will be sent to the devices in the array.
    
3) dispensers
    - Stores companyId (STRING), dispenserId (STRING), level (NUMBER), limit (NUMBER), location (STRING), useCount (NUMBER), and userId (STRING)
    - Whenever dispenser is used, the level will decrease (level represents the refill level in percentage)
    - Limit is the total number of times the dispenser can be used (default is 10)
    - useCount is the number of times the dispenser has been used since the last refill.
    - level = useCount/limit * 100
    
4) companies
    - Stores companyName (STRING), dispensers (STRING[]), users (STRING[])
    - companyId, which is used in other collections, refers to the document ID of the company document
    - dispensers stores an array of dispenser IDs of the dispensers that are registered with the company
    - users stores the user IDs of the users that are registered with the company
    
### Registration
- In order to register a company, the admin of the system needs to manually create a document in the company collection. This is to ensure that users do not have the ability to edit the details of the company collection directly
- Registration of dispensr is done through the app, whereby users can key in the location of the new dispenser and key in the dispenserId of the dispenser
- Each dispenser will ideally have a QR code which can be scanned with the app in order to register the dispenser.
- The QR code contains the dispenserId of the dispenser.
- During registration, the dispenserId will be added to the company's dispensers array

### Notifications
- Notifications are sent to relevant users only when they are currently logged in
- The device tokens of the logged in users are stored in the user document, and Firebase Cloud Messaging is used to send notifications to these users.
- 3 types of notifications: 
    1) Notify when refilled
    2) Notify when refill is running low (user can choose the refill level at which they want to be notified, from 5% -50%)
    3) Notify when refill is empty (refill level == 0)

## Usage API
- The gateway/dispenser with WiFi will send API with the companyId, dispenserId and typeOfUsage.
- The database will be updated by adding a document to usageData and updating the dispenserLevel and useCount in the dispenser document
- The dispenserLevel will be checked against the refill level that the users in the company chose to receive notifications at (notificationLevel variable in user document)
    - If the dispenserLevel is below the notificationLevel, a notification will be sent to mobile apps that are currently logged into the same company that the dispenser belongs to.
    - Notification will also be sent when the refill runs out

## Reset API
- The database will be updated by adding a document to usageData and updating the dispenserLevel in the dispenser document
- A notification will be sent to mobile apps that are currently logged into the same company that the dispenser belongs to and indicated that they want to be notified when the dispenser is refilled. (notifyWhenRefilled == true)
    
