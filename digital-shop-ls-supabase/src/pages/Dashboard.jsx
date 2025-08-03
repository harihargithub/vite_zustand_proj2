// Dashboard.jsx under src/pages folder
import { Link } from 'react-router-dom';
import Wrapper from "../components/Wrapper";

const Dashboard = () => {
  return (
    <Wrapper>
      <div style={{ padding: '20px' }}>
        <h1>Dashboard</h1>
        <p>Welcome to the Dashboard!</p>
        
        <div style={{ marginTop: '30px' }}>
          <h2>Admin Tools</h2>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '15px' }}>
            <Link 
              to="/dashboard/manage-products" 
              style={{ 
                display: 'block', 
                padding: '15px 20px', 
                backgroundColor: '#3498db', 
                color: 'white', 
                textDecoration: 'none', 
                borderRadius: '8px',
                minWidth: '180px',
                textAlign: 'center'
              }}
            >
              📦 Manage Products
            </Link>
            
            <Link 
              to="/dashboard/bot-detection" 
              style={{ 
                display: 'block', 
                padding: '15px 20px', 
                backgroundColor: '#e74c3c', 
                color: 'white', 
                textDecoration: 'none', 
                borderRadius: '8px',
                minWidth: '180px',
                textAlign: 'center'
              }}
            >
              🛡️ Bot Detection
            </Link>
            
            <Link 
              to="/dashboard/resource-distribution" 
              style={{ 
                display: 'block', 
                padding: '15px 20px', 
                backgroundColor: '#9b59b6', 
                color: 'white', 
                textDecoration: 'none', 
                borderRadius: '8px',
                minWidth: '180px',
                textAlign: 'center'
              }}
            >
              📊 Resource Distribution
            </Link>
            
            <Link 
              to="/dashboard/cart" 
              style={{ 
                display: 'block', 
                padding: '15px 20px', 
                backgroundColor: '#27ae60', 
                color: 'white', 
                textDecoration: 'none', 
                borderRadius: '8px',
                minWidth: '180px',
                textAlign: 'center'
              }}
            >
              🛒 Cart Management
            </Link>
          </div>
        </div>
      </div>
    </Wrapper>
  );
};

export default Dashboard;
