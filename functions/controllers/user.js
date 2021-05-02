// const functions = require("firebase-functions");
// const express = require("express");
// const cors = require("cors");
// const admin = require("firebase-admin");
// // const { initializeApp } = require("firebase-admin");

// admin.initializeApp();
// const db = admin.firestore();
// app.use(cors({ origin: true }));

// const app = express();

// app.get("/", async (req, res) => {
//   const snapshot = await db.collection("users").get();
//   let users = [];

//   snapshot.forEach((doc) => {
//     let id = doc.id;
//     let data = doc.data();
//     users.push({ id, ...data });
//   });

//   res.status(200).send(JSON.stringify(users));
// });

// // app.delete("/", async (req, res) => {
// //   const snapshot = await db.collection("users").fo;
// //   res.send("Successfully deleted all documents");
// // });

// app.get("/:id", async (req, res) => {
//   const snapshot = await admin
//     .firestore()
//     .collection("users")
//     .doc(req.params.id)
//     .get();
//   const userId = snapshot.id;
//   const userData = snapshot.data();

//   res.send(JSON.stringify({ userId, ...userData }));
// });

// app.put("/:id", async (req, res) => {
//   const body = req.body;
//   await db.collection("users").doc(req.params.id).update(body);

//   res.send(`Successfully updated document`);
// });

// app.post("/", async (req, res) => {
//   const user = req.body;
//   await db.collection("users").add(user);
//   res.status(201).send("Successfully added a new document");
// });

// app.delete("/:id", async (req, res) => {
//   await db.collection("users").doc(req.params.id).delete();
//   res.status(200).send("Successfully deleted document");
// });

// exports.user = functions.https.onRequest(app);
