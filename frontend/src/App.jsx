import "./App.scss";
import VendorTable from "./components/VendorTable";
import { useState } from "react";
import axios from "axios";
import CustTable from "./components/CustTable";
import CompTable from "./components/CompTable";

function App() {
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");

  const handleValueChange = (time, selLabel) => {
    console.log(selLabel, time);
    selLabel === "onlyTime"
      ? setScheduledTime(time)
      : setScheduleDateTime(time);
  };

  const handleSchedule = async () => {
    if (!scheduledTime && !scheduleDateTime) {
      alert(
        "Please select a specific duration from the Date-Time or Time box before scheduling!"
      );
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:8000/api/schedule-email",
        {
          scheduleTime: scheduleDateTime || scheduledTime,
        }
      );
      alert("Email scheduled successfully! ✅");
      console.log(response.data);
      setRefreshTrigger((prev) => !prev);
    } catch (error) {
      console.error("Error scheduling email:", error);
      alert("Failed to schedule email.");
    }
  };

  return (
    <div className="container">
      <div className="tableCont">
        <VendorTable refreshTrigger={refreshTrigger} />
        <CustTable refreshTrigger={refreshTrigger} />
        <CompTable refreshTrigger={refreshTrigger}/>
      </div>
      <div className="buttonHeading">
        Please select the date and time below to schedule An Email!
      </div>
      <input
        type="time"
        id="onlyTime"
        value={scheduledTime}
        onChange={(e) => handleValueChange(e.target.value, "onlyTime")}
      />
      <input
        type="datetime-local"
        id="dateTime"
        name="scheduleTime"
        value={scheduleDateTime}
        onChange={(e) => handleValueChange(e.target.value, "dateTime")}
      />

      <button className="actionButton" onClick={handleSchedule}>
        Save Schedule!
      </button>
    </div>
  );
}

export default App;
