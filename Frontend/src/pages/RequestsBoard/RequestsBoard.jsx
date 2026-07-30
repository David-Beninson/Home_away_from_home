import './RequestsBoard.css';
import RequestsList from '../../components/RequestsList/RequestsList';

import { useTranslation } from 'react-i18next';

export default function RequestsBoard() {
  const { t } = useTranslation(['board/requests']);
  return (
    <div className="requests-board-page">
      <h1>{t('board/requests:title')}</h1>
      <RequestsList userRole="host" />
    </div>
  );
}


