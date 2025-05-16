import "./App.scss";
import "./components/EmailSchedule.scss";
import VendorTable from "./components/VendorTable";
import { useState } from "react";
import axios from "axios";
import CustTable from "./components/CustTable";
import CompTable from "./components/CompTable";


function App() {
  const [type, setType] = useState("Vendor");
  const [refreshTrigger, setRefreshTrigger] = useState("");
  // const [formData, setFormData] = useState({});
  const [endAfterCount, setEndAfterCount] = useState(1);
  const [endOnDate, setEndOnDate] = useState("");
  const [endCondition, setEndCondition] = useState("never");
  const [requestType, setRequestType] = useState("single");
  // Single (date + time)
  const [singleTime, setSingleTime] = useState("");

  // Daily (just time)
  const [dailyTime, setDailyTime] = useState("");

  // Weekly (time + weekday)
  const [weeklyTime, setWeeklyTime] = useState("");
  const [weeklyDay, setWeeklyDay] = useState("Monday");

  // Monthly (time + date of the month)
  const [monthlyTime, setMonthlyTime] = useState("");
  const [monthlyDay, setMonthlyDay] = useState("");

  const handleValueChange = (value, field) => {
    switch (field) {
      case "weeklyTime":
        setWeeklyTime(value);
        break;
      case "weeklyDay":
        setWeeklyDay(value);
        break;
      case "monthlyTime":
        setMonthlyTime(value);
        break;
      case "monthlyDay":
        setMonthlyDay(value);
        break;
      default:
        break;
    }
  };

  // const handleSendMessage = async () => {
  //   try {
  //     const response = await axios.post(
  //       "http://localhost:8000/api/sendMessage"
  //     );
  //     alert("Email scheduled successfully! ✅");
  //     console.log(response.data);
  //     setRefreshTrigger((prev) => !prev);
  //   } catch (error) {
  //     console.error("Error scheduling email:", error);
  //     alert("Failed to schedule email.");
  //   }
  // };

  const handleSchedule = async () => {
    if (
      (requestType === "single" && !singleTime) ||
      (requestType === "daily" && !dailyTime) ||
      (requestType === "weekly" && (!weeklyTime || !weeklyDay)) ||
      (requestType === "monthly" && (!monthlyTime || !monthlyDay))
    ) {
      alert("Please fill all required scheduling fields!");
      return;
    }

    try {
      const payload = {
        userType: type,
        scheduleType: "",
        scheduleTime: "",
        scheduleDay: "",
        EndDay: "",
        Iteration: "",
      };

      // Set schedule type and time/day
      if (requestType === "single") {
        payload.scheduleType = "single";
        payload.scheduleTime = singleTime;
      } else if (requestType === "daily") {
        payload.scheduleType = "daily";
        payload.scheduleTime = dailyTime;
      } else if (requestType === "weekly") {
        payload.scheduleType = "weekly";
        payload.scheduleTime = weeklyTime;
        payload.scheduleDay = weeklyDay;
      } else if (requestType === "monthly") {
        payload.scheduleType = "monthly";
        payload.scheduleTime = monthlyTime;
        payload.scheduleDay = monthlyDay;
      }

      // Add EndDay and Iteration if not "single"
      if (requestType !== "single") {
        if (endCondition === "after") {
          payload.Iteration = String(endAfterCount); // just the number, no prefix
        } else if (endCondition === "on") {
          payload.EndDay = endOnDate; // just the date string, no "D" prefix
        }
      }

      // return console.log(payload);

      // Send the payload
      const response = await axios.post(
        "http://localhost:8000/api/schedule-message",
        payload
      );

      alert("Message scheduled successfully! ✅");
      console.log(response.data);
      setRefreshTrigger((prev) => !prev);
    } catch (error) {
      console.error("Error scheduling message:", error);
      alert("Failed to schedule message.");
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
        Please select the date and time below to schedule A WhatsApp Message!
      </div>
      {/* <div className="inpCont">
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
        <EmailSchForm onFormDataChange={setFormData} setRefreshTrigger="setRefreshTrigger"/>
        
      </div> */}
      <div className="InpCont">
        <div className="firInp">
          <label>Type:</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="Vendor">Vendor</option>
            <option value="Customer">Customer</option>
            <option value="Company">Company</option>
            <option value="All">All</option>
          </select>
        </div>
        <div className="firInp">
          <label>Request Type:</label>
          <select
            value={requestType}
            onChange={(e) => setRequestType(e.target.value)}
          >
            <option value="single">Single</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        {requestType === "single" && (
          <div className="firInp">
            <label>Select Single Time:</label>
            <input
              type="datetime-local"
              value={singleTime}
              onChange={(e) => setSingleTime(e.target.value)}
            />
          </div>
        )}
        {requestType === "daily" && (
          <div className="firInp">
            <label>Select Time:</label>
            <input
              type="time"
              value={dailyTime}
              onChange={(e) => setDailyTime(e.target.value)}
            />
          </div>
        )}
        {requestType === "weekly" && (
          <div className="firInp">
            <label>Select Weekly Time:</label>
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
        )}
        {requestType === "monthly" && (
          <div className="firInp">
            <label
              htmlFor="monthTOnly"
              style={{ fontFamily: "sans-serif", fontWeight: "600" }}
            >
              Monthly Scheduling:
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
        )}
        {requestType !== "single" ? (
          <div className="endOptions">
            <label>Ends</label>
            <div className="endOptionRow">
              <input
                type="radio"
                name="end"
                value="never"
                checked={endCondition === "never"}
                onChange={() => setEndCondition("never")}
              />
              <span>Never</span>
            </div>

            <div className="endOptionRow">
              <input
                type="radio"
                name="end"
                value="after"
                checked={endCondition === "after"}
                onChange={() => setEndCondition("after")}
              />
              <span>After</span>
              <input
                type="number"
                min="1"
                value={endAfterCount}
                onChange={(e) => setEndAfterCount(e.target.value)}
                disabled={endCondition !== "after"}
                className="endInput"
              />
              <span>times</span>
            </div>

            <div className="endOptionRow">
              <input
                type="radio"
                name="end"
                value="on"
                checked={endCondition === "on"}
                onChange={() => setEndCondition("on")}
              />
              <span>On</span>
              <input
                type="date"
                value={endOnDate}
                onChange={(e) => setEndOnDate(e.target.value)}
                disabled={endCondition !== "on"}
                className="endInput"
              />
            </div>
          </div>
        ) : (
          <></>
        )}
      </div>
      <button className="actionButton" onClick={handleSchedule}>
        Save Schedule!
      </button>
      {/* <button className="actionButton" onClick={handleSendMessage}>
        Send WhatsApp message!
      </button> */}
    </div>
  );
}

export default App;
