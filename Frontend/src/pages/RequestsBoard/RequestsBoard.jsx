import './RequestsBoard.css';
import RequestsList from '../../components/RequestsList/RequestsList';

export default function RequestsBoard() {
  return (
    <div className="requests-board-page">
      <h1>לוח בקשות אירוח לחיילים</h1>
      <RequestsList userRole="host" />
    </div>
  );
}


