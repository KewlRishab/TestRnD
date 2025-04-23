import "./App.scss";
import VendorTable from "./components/VendorTable";
import { useState } from "react";
import axios from "axios";

function App() {
  const [scheduleTime, setScheduleTime] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(false);


  const handleTimeChange=(time)=>{
    console.log(time)
    setScheduleTime(time)
  }

  const handleSchedule = async () => {
    if (!scheduleTime) {
      alert("Please select a date and time first!");
      return;
    }

    try {
      const response = await axios.post("http://localhost:8000/api/schedule-email", {
        email: "remorsivemate@gmail.com", 
        scheduleTime: scheduleTime,
      });

      alert("✅ Email scheduled successfully!");
      console.log(response.data);
      setRefreshTrigger(prev => !prev); 
    } catch (error) {
      console.error("❌ Error scheduling email:", error);
      alert("Failed to schedule email.");
    }
  };

  return (
    <div className="container">
      <VendorTable refreshTrigger={refreshTrigger} />
      <div className="buttonHeading">
        Please select the date and time below to schedule An Email!
      </div>

      <input
        type="datetime-local"
        id="datetime"
        name="scheduleTime"
        value={scheduleTime}
        onChange={(e) =>handleTimeChange(e.target.value)}
      />

      <button className="actionButton" onClick={handleSchedule}>
        Save Schedule!
      </button>
    </div>
  );
}

export default App;
