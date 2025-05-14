const axios = require('axios');

const sendTxtMsg = async (iid, to, apikey, authToken) => {

    try {
        const response = await axios.post(
            'https://swift-send.click/api/v1.0/sendmessage', {
            iid: iid,
            to: to,
            templateId: "541290625248929"
        },
            {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    Cookie: `apikey=${apikey}`
                },
                
            }
        );
        return response.data;
    } catch (error) {
        // console.log("error : ", error)
        console.error("Send Failed :", error.response?.data || error.message);
        return null;
    }
};

module.exports = { sendTxtMsg };
