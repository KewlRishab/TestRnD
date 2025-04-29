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
        <CompTable refreshTrigger={refreshTrigger} />
      </div>
      <div className="buttonHeading">
        Please select the date and time below to schedule An Email!
      </div>
      <div className="inpCont">
        <div className="timeInp">
          <label
            htmlFor="onlyTime"
            style={{ fontFamily: "sans-serif", fontWeight: "600" }}
          >
            Daily Scheduling:-
          </label>
          <input
            type="time"
            id="onlyTime"
            className="normalInputStyle"
            value={scheduledTime}
            onChange={(e) => handleValueChange(e.target.value, "onlyTime")}
          />
        </div>
        <div className="timeInp">
          <label
            htmlFor="dateTime"
            style={{ fontFamily: "sans-serif", fontWeight: "600" }}
          >
            Single Scheduling :-
          </label>
          <input
            type="datetime-local"
            id="dateTime"
            className="normalInputStyle"
            name="scheduleTime"
            value={scheduleDateTime}
            onChange={(e) => handleValueChange(e.target.value, "dateTime")}
          />
        </div>
        <div className="timeInp">
          <label
            htmlFor="weekTOnly"
            style={{ fontFamily: "sans-serif", fontWeight: "600" }}
          >
            Weekly Scheduling :-
          </label>
          <input
            type="time"
            id="weekTOnly"
            className="normalInputStyle"
            value={scheduledTime}
            onChange={(e) => handleValueChange(e.target.value, "onlyTime")}
          />
          <select id="weekSOnly" className="normalInputStyle">
            <option value="Monday">Mon</option>
            <option value="Tuesday">Tue</option>
            <option value="Wednesday">Wed</option>
            <option value="Thursday">Thu</option>
            <option value="Friday">Fri</option>
            <option value="Saturday">Sat</option>
            <option value="Sunday">Sun</option>
          </select>
        </div>
        <div className="timeInp">
          <label
            htmlFor="monthTOnly"
            style={{ fontFamily: "sans-serif", fontWeight: "600" }}
          >
            Monthly Scheduling :-
          </label>
          <input
            type="time"
            id="monthTOnly"
            className="normalInputStyle"
            value={scheduledTime}
            onChange={(e) => handleValueChange(e.target.value, "onlyTime")}
          />
          <input
            type="number"
            id="monthDOnly"
            className="normalInputStyle"
            min="1"
            max="31"
            onInput={(e) => {
              const value = parseInt(e.target.value);
              if (value < 1) e.target.value = 1;
              if (value > 31) e.target.value = 31;
            }}
          />
        </div>
      </div>
      <button className="actionButton" onClick={handleSchedule}>
        Save Schedule!
      </button>
    </div>
  );
}

export default App;
