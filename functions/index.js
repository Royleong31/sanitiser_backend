const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
var newData;

app.patch("/:companyId/:dispenserId/usage", async (req, res) => {
  const dispenserId = req.params.dispenserId;
  let dispenserData, dispenserDocId;
  const companyId = req.params.companyId; 

  // let dispenserData = await db.collection("dispensers").doc(dispenserId).get();
  console.log(`Dispenser ID: ${dispenserId}`);
  console.log(`Company ID: ${companyId}`);
  // SHOULD RETURN ONLY 1 DOC
  let dispenserInfo = await db
    .collection("dispensers")
    .where("dispenserId", "==", dispenserId)
    .where("companyId", "==", companyId) // change to companyId == companyId
    .get();

  dispenserInfo.forEach((doc) => {
    dispenserDocId = doc.id;
    dispenserData = doc.data();
  });

  console.log(`DispenserDocId : ${dispenserDocId}`);
  console.log(`DispenserData : ${dispenserData}`);

  if (!dispenserData) res.status(400).send("Invalid user ID or dispenser ID");


  let companyInfo = await db.collection('companies').doc(companyId).get();
  let companyData = companyInfo.data();
  let users = companyData['users'];

  let userData = [];
  let userInfo = await db
    .collection("users")
    .where("companyId", "==", companyId)
    .get();

  userInfo.forEach(doc => userData.push(doc.data()));
  userData.forEach((doc) => { // TODO: change to map function
    console.log(`User notification Level: ${doc['notificationLevel']}`);
  });


  const limit = dispenserData["limit"];
  const location = dispenserData["location"];
  let newUseCount = 1 + dispenserData["useCount"];
  // newUseCount = newUseCount >= limit ? limit : newUseCount;

  if (newUseCount <= limit) {
    db.collection("usageData").add({
      dispenserId,
      timeStamp: new Date().toISOString(),
      companyId,
      wasUsed: true,
    });

    let newLevel = 100 - Math.round(100 * (newUseCount / limit)); //if newUseCount == 100, newLevel = 0

    await db.collection("dispensers").doc(dispenserDocId).update({
      useCount: newUseCount,
      level: newLevel,
    });

    for (let user of userData) {
      const userDeviceList = user['deviceTokens'];
      const notificationLevel = +user['notificationLevel'];
      console.log(`USER: DEVICE LIST: ${userDeviceList}`);
      console.log(`USER: NOTIFICATION LEVEL: ${notificationLevel}`);
      
      if (
        newUseCount == limit ||
        newUseCount == limit - Math.round(notificationLevel / 100 * limit) // send notification at 1 below the threshold
      ) {
        console.log(`Triggering cloud messaging for usage as newUseCount = ${newUseCount}`);

        let bodyText =
          newLevel == 0
            ? `${location} refill is empty`
            : `${location} refill is under ${notificationLevel}%`; // change to below notification set level

        let payload = {
          notification: {
            title: "Refill Low",
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
            .sendToDevice(
              userDeviceList,
              payload
            );
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



















app.patch("/:userId/:dispenserId/reset", async (req, res) => {
  const userId = req.params.userId;
  const dispenserId = req.params.dispenserId;
  let dispenserData, dispenserDocId;

  let dispenserInfo = await db
    .collection("dispensers")
    .where("dispenserId", "==", dispenserId)
    .where("userId", "==", userId)
    .get();

  dispenserInfo.forEach((doc) => {
    console.log("Test Data");
    dispenserDocId = doc.id;
    console.log(doc.id, "=>", doc.data());
    dispenserData = doc.data();
  });

  let userInfo = await db
    .collection("users")
    .where("userId", "==", userId)
    .get();

  userInfo.forEach((doc) => {
    console.log("User Info");
    userDocId = doc.id;
    console.log("User Info", doc.id, "=>", doc.data());
    userData = doc.data();
  });

  let userDeviceList = userData['deviceTokens'];
  let notifyWhenRefilled = userData['notifyWhenRefilled'];

   if (!dispenserData) res.status(400).send("Invalid user or dispenser ID");

  const level = dispenserData["level"];
  const location = dispenserData["location"];

  if (+level === 100) {
    res.send("Refill is already full");
  } else {
    db.collection("usageData").add({
      dispenserId,
      timeStamp: new Date().toISOString(),
      userId,
      wasUsed: false,
    });

    let payload = {
      notification: {
        // title: "Refill",
        title: `${location} refilled`,
        body: `${location} unit has been refilled`,
      },
      data: {
        title: `${location} unit was refilled`,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
    };

    if (notifyWhenRefilled) {
      try {
        console.log("sending reset notification");
        const response = await admin
          .messaging()
          .sendToDevice(
            userDeviceList,
            payload
          );
      } catch {
        console.log("Error sending notification");
      }
    }


    await db.collection("dispensers").doc(dispenserDocId).update({
      useCount: 0,
      level: 100,
      // alert: false,
    });

    res.send(JSON.stringify({ dispenserData }));
  }
});

exports.usage = functions.https.onRequest(app);

