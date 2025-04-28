import React, { useEffect, useState } from 'react';
import './VendorList.scss';
import axios from 'axios';

const CompTable = ({refreshTrigger}) => {
  const [compList, setCompList] = useState([]);

  useEffect(() => {
    const fetchComps = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/getCompData');
        console.log(res);
        setCompList(res.data); 
      } catch (error) {
        console.error('Error fetching Company data:', error);
      }
    };

    fetchComps();
  }, [refreshTrigger]);

  return (
    <div className="vendor-table-container">
      <h2>Company List</h2>
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
          {compList.map((comp) => (
            <tr key={comp._id}>
              <td>{comp.comp_name}</td>
              <td>{comp.comp_address}</td>
              <td>{comp.comp_phoneNo}</td>
              <td>{comp.comp_email}</td>
              <td>{comp.comp_invoice}</td>
              <td
                style={{
                  color: comp.scheduled_req === 'scheduled' ? 'green' : 'orange',
                  fontWeight: 'bold',
                }}
              >
                {comp.scheduled_req}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CompTable;
