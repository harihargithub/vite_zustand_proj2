// src/components/SearchActivities.jsx
import { useState } from 'react';
import { useActivityStore } from '../store/useActivityStore';

// Component for searching activities ie. state management
export default function SearchActivities() {
  const [keyword, setKeyword] = useState('');
  const searchActivities = useActivityStore((state) => state.searchActivities);
  const isLoading = useActivityStore((state) => state.isLoading);
  const activityList = useActivityStore((state) => state.activityList);

  // Handle form submission to search activities
  const handleSubmit = (e) => {
    e.preventDefault();
    searchActivities({ keyword });
  };

  return (
    <div>
      {  /* Form to capture search keyword & rendered unconditionally */ }
      <form onSubmit={handleSubmit}>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search activities..."
        />
        <button type="submit" disabled={isLoading}>Search</button>
      </form>

      {/* Loading message is conditionally rendered */} 
      {isLoading && <p>Loading...</p>}

      <ul>
        {activityList.map((act) => (
          <li key={act.id}>ID: {act.id} - Name: {act.name}</li>
        ))}
      </ul>
    </div>
  );
}