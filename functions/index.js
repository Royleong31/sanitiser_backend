const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));

// Usage API
app.patch("/:companyId/:dispenserId/usage", async (req, res) => {
  const companyId = req.params.companyId;
  const dispenserId = req.params.dispenserId;
  let dispenserData, dispenserDocId;

  // let dispenserData = await db.collection("dispensers").doc(dispenserId).get();
  console.log(`Dispenser ID: ${dispenserId}`);
  console.log(`Company ID: ${companyId}`);
  // SHOULD RETURN ONLY 1 DOC
  let dispenserInfo = await db
    .collection("dispensers")
    .where("dispenserId", "==", dispenserId)
    .where("companyId", "==", companyId) // change to companyId == companyId
    .get();

  //  dispenserInfo consists of only 1 element, but I used a forEach loop as it didnt work without
  dispenserInfo.forEach((doc) => {
    dispenserDocId = doc.id;
    dispenserData = doc.data();
  });

  console.log(`DispenserDocId : ${dispenserDocId}`);
  console.log(`DispenserData : ${dispenserData}`);

  //    Reject the API request and send an error to the sender if there was no dispenser with the corresponding dispenserId and companyId
  if (!dispenserData) {
    res.status(400).send("Invalid user ID or dispenser ID");
    return;
  }

  let companyInfo = await db.collection("companies").doc(companyId).get(); // company document
  let companyData = companyInfo.data();
  let users = companyData["users"]; // array of users in the company

  let userData = [];
  let userInfo = await db
    .collection("users")
    .where("companyId", "==", companyId)
    .get();

  userInfo.forEach((doc) => userData.push(doc.data())); // contains the document details about each user
  userData.forEach((doc) => {
    console.log(`User notification Level: ${doc["notificationLevel"]}`);
  });

  const limit = dispenserData["limit"]; // capacity of the dispenser
  const location = dispenserData["location"]; // location name of the dispenser
  let newUseCount = 1 + dispenserData["useCount"]; // newUseCount = old use count + 1
  // newUseCount = newUseCount >= limit ? limit : newUseCount;

  if (newUseCount <= limit) {
    // if the refill is not yet empty
    //      Add a new document into the usageData collection
    db.collection("usageData").add({
      dispenserId,
      timeStamp: new Date().toISOString(),
      companyId,
      wasUsed: true,
    });

    //      New refill level of the dispenser
    let newLevel = 100 - Math.round(100 * (newUseCount / limit)); //if newUseCount == 100, newLevel = 0

    //      Update the dispenser document in the dispensers collection
    await db.collection("dispensers").doc(dispenserDocId).update({
      useCount: newUseCount,
      level: newLevel,
    });

    for (let user of userData) {
      // for each user that is registered to this company
      const userDeviceList = user["deviceTokens"];
      const notificationLevel = +user["notificationLevel"];
      console.log(`USER: DEVICE LIST: ${userDeviceList}`);
      console.log(`USER: NOTIFICATION LEVEL: ${notificationLevel}`);

      if (
        // if the refill is empty or is below the preset refill level threshold
        newUseCount == limit ||
        newUseCount == Math.ceil(limit - (notificationLevel / 100) * limit) // send notification at 1 below the threshold
      ) {
        console.log(
          `Triggering cloud messaging for usage as newUseCount = ${newUseCount}`
        );

        //          bodyText and payload are both parts of the message that is sent to the devices to produce an app notification
        let bodyText =
          newLevel == 0
            ? `${location} refill is empty`
            : `${location} refill is under ${notificationLevel}%`;

        let notificationTitle = newLevel == 0 ? "Refill Empty" : "Refill Low";

        let payload = {
          notification: {
            title: notificationTitle,
            body: bodyText,
          },
          data: {
            body: `${location} refill is at ${newLevel}%`,
            title: "Refill Low",
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
        };

        try {
          const response = await admin
            .messaging()
            .sendToDevice(userDeviceList, payload);
        } catch {
          console.log("Error sending notification");
        }
      }
    }

    res.send(JSON.stringify({ dispenserData }));
  } else {
    res.send("Refill is already empty");
  }
});

// Resetting API
app.patch("/:companyId/:dispenserId/reset", async (req, res) => {
  //    much of the code is similar to the above code
  const companyId = req.params.companyId;
  const dispenserId = req.params.dispenserId;
  let dispenserData, dispenserDocId;

  let dispenserInfo = await db
    .collection("dispensers")
    .where("dispenserId", "==", dispenserId)
    .where("companyId", "==", companyId)
    .get();

  // ONLY 1 SUCH DISPENSER
  dispenserInfo.forEach((doc) => {
    dispenserDocId = doc.id;
    dispenserData = doc.data();
  });

  console.log(`DispenserDocId : ${dispenserDocId}`);
  console.log(`DispenserData : ${dispenserData}`);

  if (!dispenserData) {
    res.status(400).send("Invalid user ID or dispenser ID");
    return;
  }

  let companyInfo = await db.collection("companies").doc(companyId).get();
  let companyData = companyInfo.data();
  let users = companyData["users"];
  let userData = [];

  let userInfo = await db
    .collection("users")
    .where("companyId", "==", companyId)
    .get();

  userInfo.forEach((doc) => userData.push(doc.data()));
  userData.forEach((doc) => {
    console.log(`User notifyWhenRefilled: ${doc["notifyWhenRefilled"]}`);
  });

  const level = dispenserData["level"];
  const location = dispenserData["location"];

  if (+level === 100) {
    // check if the refill is already full
    res.send("Refill is already full");
  } else {
    await db.collection("dispensers").doc(dispenserDocId).update({
      // update the dispenser document with the new refill level
      useCount: 0,
      level: 100,
    });

    db.collection("usageData").add({
      // add a new usageData document
      dispenserId,
      timeStamp: new Date().toISOString(),
      companyId,
      wasUsed: false,
    });

    for (let user of userData) {
      // for each user that is registered to this company
      const userDeviceList = user["deviceTokens"];
      const notifyWhenRefilled = user["notifyWhenRefilled"];
      console.log(`USER: DEVICE LIST: ${userDeviceList}`);
      console.log(`USER: NOTIFYWHENREFILLED: ${notifyWhenRefilled}`);

      let payload = {
        notification: {
          title: `${location} refilled`,
          body: `${location} unit has been refilled`,
        },
        data: {
          title: `${location} unit was refilled`,
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
      };

      if (notifyWhenRefilled) {
        // send notification to them if they want to be notified
        try {
          console.log("sending reset notification");
          const response = await admin
            .messaging()
            .sendToDevice(userDeviceList, payload);
        } catch (err) {
          console.log(`Error sending notification, ERROR: ${err}`);
        }
      }
    }
    res.send(JSON.stringify({ dispenserData }));
  }
});

exports.usage = functions.https.onRequest(app);
