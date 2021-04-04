const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
var newData;

app.patch("/:userId/:dispenserId/usage", async (req, res) => {
  const userId = req.params.userId;
  const dispenserId = req.params.dispenserId;
  let dispenserData, docId;

  // let dispenserData = await db.collection("dispensers").doc(dispenserId).get();

  let testData = await db
    .collection("dispensers")
    .where("dispenserId", "==", dispenserId)
    .where("userId", "==", userId)
    .get();

  testData.forEach((doc) => {
    console.log("Test Data");
    docId = doc.id;
    console.log(doc.id, "=>", doc.data());
    dispenserData = doc.data();
  });

  if (!dispenserData) res.send("Invalid id"); //RETURN FUNCTION IF EITHER USER OR DISPENSER DOES NOT EXIST

  const limit = dispenserData["limit"];
  const location = dispenserData["location"];
  let newUseCount = 1 + dispenserData["useCount"];
  // newUseCount = newUseCount >= limit ? limit : newUseCount;

  if (newUseCount <= limit) {
    db.collection("usageData").add({
      dispenserId,
      timeStamp: new Date().toISOString(),
      userId,
      wasUsed: true,
    });

    let newLevel = 100 - Math.round(100 * (newUseCount / limit)); //if newUseCount == 100, newLevel = 0
    const alert = newLevel <= 10 ? true : false;

    await db.collection("dispensers").doc(docId).update({
      useCount: newUseCount,
      level: newLevel,
      alert,
    });

    if (
      newUseCount == limit ||
      newUseCount == limit - Math.round(0.1 * limit)
    ) {
      let bodyText =
        newLevel == 0
          ? `${location} refill is empty`
          : `${location} refill is under 10%`;

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
            [
              "cWPyIZl5QYia6bIG001eHO:APA91bFtLOakigUqA15GlwyI36Ob2qk69ivxlj0MPdPRGNBIfZNydgNfTEblLlfQlCoxNZ6rC9xnJpJDoaYWLUcWIeSXyjsYConz0gWNhVcnHg_tLin2HzuAR2LmF0vw61qOSmv__oSa",
            ],
            payload
          );
      } catch {
        console.log("Error sending notification");
      }
    }

    res.send(JSON.stringify({ dispenserData }));
  } else {
    res.send("Refill is already empty");
    newUseCount = limit;
  }
});

app.patch("/:userId/:dispenserId/reset", async (req, res) => {
  const userId = req.params.userId;
  const dispenserId = req.params.dispenserId;
  let dispenserData, docId;

  let testData = await db
    .collection("dispensers")
    .where("dispenserId", "==", dispenserId)
    .where("userId", "==", userId)
    .get();

  testData.forEach((doc) => {
    console.log("Test Data");
    docId = doc.id;
    console.log(doc.id, "=>", doc.data());
    dispenserData = doc.data();
  });

  if (!dispenserData) res.send("Invalid id");

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
        title: `${location} unit has been refilled`,
      },
      data: {
        title: `${location} unit was refilled`,
        // body: `${location} refill is at ${newLevel}%`,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
    };

    try {
      const response = await admin
        .messaging()
        .sendToDevice(
          [
            "cWPyIZl5QYia6bIG001eHO:APA91bFtLOakigUqA15GlwyI36Ob2qk69ivxlj0MPdPRGNBIfZNydgNfTEblLlfQlCoxNZ6rC9xnJpJDoaYWLUcWIeSXyjsYConz0gWNhVcnHg_tLin2HzuAR2LmF0vw61qOSmv__oSa",
          ],
          payload
        );
    } catch {
      console.log("Error sending notification");
    }

    await db.collection("dispensers").doc(docId).update({
      useCount: 0,
      level: 100,
      alert: false,
    });

    res.send(JSON.stringify({ dispenserData }));
  }
});

exports.usage = functions.https.onRequest(app);

// app.get("/users", async (req, res) => {
//   const snapshot = await db.collection("users").get();
//   let users = [];

//   snapshot.forEach((doc) => {
//     let id = doc.id;
//     let data = doc.data();
//     users.push({ id, ...data });
//   });

//   res.status(200).send(JSON.stringify(users));
// });

// app.get("/dispensers", async (req, res) => {
//   const snapshot = await db.collection("dispensers").get();
//   let users = [];

//   snapshot.forEach((doc) => {
//     let id = doc.id;
//     let data = doc.data();
//     users.push({ id, ...data });
//   });

//   res.status(200).send(JSON.stringify(users));
// });

// app.get("/usageData", async (req, res) => {
//   const snapshot = await db.collection("usageData").get();
//   let users = [];

//   snapshot.forEach((doc) => {
//     let id = doc.id;
//     let data = doc.data();
//     users.push({ id, ...data });
//   });

//   res.status(200).send(JSON.stringify(users));
// });

// exports.messageTrigger = functions.firestore
//   .document("Messages/{messageId}")
//   .onCreate(async (snapshot, context) => {
//     if (snapshot.empty) {
//       console.log("No devices");
//       return;
//     }

//     newData = snapshot.data;
//     var payload = {
//       notification: { title: "Push title", body: "Push body" },
//       data: {
//         message: "Message",
//         body: "Body",
//         title: "Titlte",
//         click_action: "FLUTTER_NOTIFICATION_CLICK",
//       },
//     };

//     try {
//       const response = await admin
//         .messaging()
//         .sendToDevice(
//           [
//             "cWPyIZl5QYia6bIG001eHO:APA91bFtLOakigUqA15GlwyI36Ob2qk69ivxlj0MPdPRGNBIfZNydgNfTEblLlfQlCoxNZ6rC9xnJpJDoaYWLUcWIeSXyjsYConz0gWNhVcnHg_tLin2HzuAR2LmF0vw61qOSmv__oSa",
//           ],
//           payload
//         );
//     } catch {
//       console.log("Error sending notification");
//     }
//   });
