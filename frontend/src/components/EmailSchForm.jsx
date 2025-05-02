import React, { useState } from "react";
import "./EmailSchedule.scss";
const EmailSchForm = () => {
  const [type, setType] = useState("Vendor");
  const [requestType, setRequestType] = useState("single");
  const [singleTime, setSingleTime] = useState("");
  const [dailyTime, setDailyTime] = useState("");
  const [weeklyTime, setWeeklyTime] = useState("");
  const [weeklyDay, setWeeklyDay] = useState("Monday");
  const [monthlyTime, setMonthlyTime] = useState("");
  const [monthlyDay, setMonthlyDay] = useState("");
  const [endCondition, setEndCondition] = useState("never");
  const [endAfterCount, setEndAfterCount] = useState(1);
  const [endOnDate, setEndOnDate] = useState("");

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

  return (
    <div className="cont">
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
  );
};

export default EmailSchForm;
