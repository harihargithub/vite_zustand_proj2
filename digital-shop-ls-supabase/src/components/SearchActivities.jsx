// src/components/SearchActivities.jsx
import { useState } from 'react';
import { useActivityStore } from '../store/useActivityStore';

export default function SearchActivities() {
  const [keyword, setKeyword] = useState('');
  const searchActivities = useActivityStore((state) => state.searchActivities);
  const isLoading = useActivityStore((state) => state.isLoading);
  const activityList = useActivityStore((state) => state.activityList);

  const handleSubmit = (e) => {
    e.preventDefault();
    searchActivities({ keyword });
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search activities..."
        />
        <button type="submit" disabled={isLoading}>Search</button>
      </form>

      {isLoading && <p>Loading...</p>}

      <ul>
        {activityList.map((act) => (
          <li key={act.id}>{act.name}</li>
        ))}
      </ul>
    </div>
  );
}