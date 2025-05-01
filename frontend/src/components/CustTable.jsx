import React, { useEffect, useState } from 'react';
import './VendorList.scss';
import axios from 'axios';

const CustTable = ({refreshTrigger}) => {
  const [custList, setCustList] = useState([]);

  useEffect(() => {
    const fetchCusts = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/getCustData');
        console.log(res);
        setCustList(res.data); 
      } catch (error) {
        console.error('Error fetching Customer data:', error);
      }
    };

    fetchCusts();
  }, [refreshTrigger]);

  return (
    <div className="vendor-table-container">
      <h2>Customer List</h2>
      <table className="vendor-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Address</th>
            <th>Phone No</th>
            <th>Email</th>
            <th>Invoice</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {custList.map((cust) => (
            <tr key={cust._id}>
              <td>{cust.cust_name}</td>
              <td>{cust.cust_address}</td>
              <td>{cust.cust_phoneNo}</td>
              <td>{cust.cust_email}</td>
              <td>{cust.cust_invoice}</td>
              <td
                style={{
                  color: cust.scheduled_req === 'sent' ? 'green' : 'orange',
                  fontWeight: 'bold',
                }}
              >
                {cust.scheduled_req}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CustTable;
