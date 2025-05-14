// const express = require('express');
// const { sendTxtMsg } = require('../API/sendTxtMsg');
// const { loginAPI } = require('../API/loginAPI');
// const router = express.Router();


// // GET all customer data
// router.post('/sendMessage', async (req, res) => {
//     try {
//         const loginRes = await loginAPI(); // returns the object you just showed
//         if (!loginRes || !loginRes.token || !loginRes.iid) {
//             throw new Error("Failed to get auth token or instance ID");
//         }

//         console.log("loginRes's id :", loginRes.iid);
//         console.log("loginRes's token :", loginRes.token);
//         console.log("loginRes's apikey :", loginRes.apikey);

//         const { token, iid, apikey } = loginRes;

//         const msgResponse = await sendTxtMsg(iid, 7889740436, apikey, token);
//         console.log("msgResponse: ", msgResponse);

//         if (!msgResponse) throw new Error("Failed to send WhatsApp message");
//         console.log(` WhatsApp message sent to 7889740436`);
//     } catch (err) {
//         console.error(` Failed to send message to  7889740436`, err);
//         // Keep it pending for retry
//     }
// });

// module.exports = router;
