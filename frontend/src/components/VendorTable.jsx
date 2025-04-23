import React, { useEffect, useState } from 'react';
import './VendorList.scss';
import axios from 'axios';

const VendorTable = ({refreshTrigger}) => {
  const [vendorList, setVendorList] = useState([]);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/getVendorData');
        console.log(res);
        setVendorList(res.data); 
      } catch (error) {
        console.error('Error fetching vendor data:', error);
      }
    };

    fetchVendors();
  }, [refreshTrigger]);

  return (
    <div className="vendor-table-container">
      <h2>Vendor List</h2>
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
          {vendorList.map((vendor) => (
            <tr key={vendor._id}>
              <td>{vendor.vendor_name}</td>
              <td>{vendor.vendor_address}</td>
              <td>{vendor.vendor_phoneNo}</td>
              <td>{vendor.vendor_email}</td>
              <td>{vendor.vendor_invoice}</td>
              <td
                style={{
                  color: vendor.scheduled_req === 'scheduled' ? 'green' : 'orange',
                  fontWeight: 'bold',
                }}
              >
                {vendor.scheduled_req}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VendorTable;
