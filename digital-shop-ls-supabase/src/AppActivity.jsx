// src/AppActivity.jsx
import ActivityCounter from './components/ActivityCounter.jsx';
import SearchActivities from './components/SearchActivities.jsx';

function AppActivity() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
      <h1>Activity Search</h1>
      <SearchActivities />
      <ActivityCounter />
    </div>
  );
}
export default AppActivity;