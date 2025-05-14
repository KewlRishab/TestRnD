const axios = require('axios');

const loginAPI = async () => {
  try {
    const response = await axios.post('https://swift-send.click/api/v1.0/signin', {
      email: "gajjarharah1104@gmail.com",
      password: "Admin@123",
      type: "root"
    });
    //  console.log("Reponse's Object :",response.data.data);
    return response.data.data; // contains token, most likely
  } catch (error) {
    console.error("Login failed:", error.response?.data || error.message);
    return null;
  }
};

module.exports = { loginAPI };
