import "./App.scss";
import VendorTable from "./components/VendorTable";
import { useState } from "react";
import axios from "axios";
import CustTable from "./components/CustTable";
import CompTable from "./components/CompTable";

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState("");
  // Single (date + time)
  const [scheduleDateTime, setScheduleDateTime] = useState("");

  // Daily (just time)
  const [scheduledTime, setScheduledTime] = useState("");

  // Weekly (time + weekday)
  const [weeklyTime, setWeeklyTime] = useState("");
  const [weeklyDay, setWeeklyDay] = useState("Monday");

  // Monthly (time + date of the month)
  const [monthlyTime, setMonthlyTime] = useState("");
  const [monthlyDay, setMonthlyDay] = useState(""); // 1 to 31

  const handleValueChange = (time, selLabel) => {
    console.log(selLabel, time);
    switch (selLabel) {
      case "onlyTime":
        setScheduledTime(time);
        break;
      case "dateTime":
        setScheduleDateTime(time);
        break;
      case "weeklyTime":
        setWeeklyTime(time);
        break;
      case "weeklyDay":
        setWeeklyDay(time);
        break;
      case "monthlyTime":
        setMonthlyTime(time);
        break;
      case "monthlyDay":
        setMonthlyDay(time);
        break;
      default:
        break;
    }
  };

  const handleSchedule = async () => {
    if (!scheduledTime && !scheduleDateTime && !weeklyTime && !monthlyTime) {
      alert("Please select a specific duration from the Date-Time or Time box before scheduling!");
      return;
    } else if (monthlyTime && !monthlyDay) {
      alert("Please Select a day specified for Monthly scheduling!");
      return;
    }

    try {
      const payload = {
        scheduleType: "",
        scheduleTime: "",
        scheduleDay: "",
      };

      if (scheduleDateTime) {
        payload.scheduleType = "single";
        payload.scheduleTime = scheduleDateTime;
      } else if (scheduledTime) {
        payload.scheduleType = "daily";
        payload.scheduleTime = scheduledTime;
      } else if (weeklyTime) {
        payload.scheduleType = "weekly";
        payload.scheduleTime = weeklyTime;
        payload.scheduleDay = weeklyDay; // Monday, Tuesday, etc.
      } else if (monthlyTime) {
        payload.scheduleType = "monthly";
        payload.scheduleTime = monthlyTime;
        payload.scheduleDay = monthlyDay; // 1 to 31
      }

      // return console.log(payload);

      const response = await axios.post(
        "http://localhost:8000/api/schedule-email",
        payload
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
            value={weeklyTime}
            onChange={(e) => handleValueChange(e.target.value, "weeklyTime")}
          />
          <select
            id="weekSOnly"
            className="normalInputStyle"
            value={weeklyDay}
            onChange={(e) => handleValueChange(e.target.value, "weeklyDay")}
          >
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
            value={monthlyTime}
            onChange={(e) => handleValueChange(e.target.value, "monthlyTime")}
          />
          <input
            type="number"
            id="monthDOnly"
            placeholder="dd"
            className="normalInputStyle"
            min="1"
            max="31"
            value={monthlyDay}
            onInput={(e) => {
              const value = parseInt(e.target.value);
              if (value < 1) e.target.value = 1;
              if (value > 31) e.target.value = 31;
            }}
            onChange={(e) => handleValueChange(e.target.value, "monthlyDay")}
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
