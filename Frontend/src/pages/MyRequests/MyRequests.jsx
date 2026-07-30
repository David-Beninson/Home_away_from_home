import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Newspaper } from 'lucide-react';
import './MyRequests.css';
import RequestsList from '../../components/RequestsList/RequestsList';
import CreatePostModal from '../../components/RequestsList/CreatePostModal';
import { fetchPosts } from '../../store/requestsSlice';
import { useTranslation } from 'react-i18next';

export default function MyRequests() {
  const { t } = useTranslation(['guest/requests']);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dispatch = useDispatch();

  return (
    <div className="my-requests-page">
      <div className="my-requests-header">
        <button
          className="my-requests-create-btn"
          onClick={() => setIsModalOpen((prev) => !prev)}
        >
          <Newspaper size={16} />
          {t('guest/requests:my_requests.create_btn')}
        </button>
      </div>
      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => dispatch(fetchPosts())}
      />

      <RequestsList userRole="guest" />
    </div>
  );
}
