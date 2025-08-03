import { useActivityStore } from '../store/useActivityStore';

export default function ActivityCounter() {
  // Access the same global state from the store
  const activityList = useActivityStore((state) => state.activityList);
  const isLoading = useActivityStore((state) => state.isLoading);
  
  return (
    <div style={{ 
      padding: '10px', 
      margin: '10px 0', 
      backgroundColor: '#f0f0f0', 
      border: '1px solid #ccc',
      borderRadius: '5px'
    }}>
      <h3>Activity Counter</h3>
      <p><strong>Total Activities Found:</strong> {activityList.length}</p>
      <p><strong>Status:</strong> {isLoading ? 'Searching...' : 'Ready'}</p>
      
      {activityList.length > 0 && (
        <div>
          <strong>Found activities:</strong>
          <ul style={{ margin: '5px 0' }}>
            {activityList.map((act) => (
              <li key={act.id} style={{ fontSize: '12px' }}>
                {act.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}