const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));

app.get("/users", async (req, res) => {
  const snapshot = await db.collection("users").get();
  let users = [];

  snapshot.forEach((doc) => {
    let id = doc.id;
    let data = doc.data();
    users.push({ id, ...data });
  });

  res.status(200).send(JSON.stringify(users));
});

app.get("/dispensers", async (req, res) => {
  const snapshot = await db.collection("dispensers").get();
  let users = [];

  snapshot.forEach((doc) => {
    let id = doc.id;
    let data = doc.data();
    users.push({ id, ...data });
  });

  res.status(200).send(JSON.stringify(users));
});

app.get("/usageData", async (req, res) => {
  const snapshot = await db.collection("usageData").get();
  let users = [];

  snapshot.forEach((doc) => {
    let id = doc.id;
    let data = doc.data();
    users.push({ id, ...data });
  });

  res.status(200).send(JSON.stringify(users));
});

app.patch("/:userId/:dispenserId/usage", async (req, res) => {
  const userId = req.params.userId;
  const dispenserId = req.params.dispenserId;

  db.collection("usageData").add({
    dispenserId,
    timeStamp: new Date().toISOString(),
    userId,
    wasUsed: true,
  });

  let dispenserData = await db
    .collection("dispensers")
    .doc(dispenserId)
    .get();

  await db
    .collection("dispensers")
    .where("dispenserId", "==", dispenserId)
    .where("userId", "==", userId);

  console.log(dispenserData);

  dispenserData = dispenserData.data();
  console.log(dispenserData["alert"]);
  console.log(dispenserData["level"]);
  console.log(dispenserData["useCount"]);

  await db
    .collection("dispensers")
    .doc("testDoc")
    .set({ title: "Testing title", body: "Testing body" });

  const limit = dispenserData["limit"];
  let newUseCount = 1 + dispenserData["useCount"];
  newUseCount = newUseCount >= limit ? limit : newUseCount;
  let newLevel = 100 - Math.round(100 * (newUseCount / limit));
  newLevel = newLevel <= 0 ? 0 : newLevel;

  const alert = newLevel <= 10 ? true : false;

  await db.collection("dispensers").doc(dispenserId).update({
    useCount: newUseCount,
    level: newLevel,
    alert,
  });

  res.send(JSON.stringify({ dispenserData }));
});

exports.usage = functions.https.onRequest(app);
