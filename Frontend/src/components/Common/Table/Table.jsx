import { useTranslation } from 'react-i18next';

export default function Table({ headers, dataLength, fallbackText, children }) {
  const { t } = useTranslation(['common/table']);
  const hasData = typeof dataLength === 'number' ? dataLength > 0 : true;

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hasData ? (
            children
          ) : (
            <tr>
              <td 
                colSpan={headers.length} 
                className="admin-table-fallback"
              >
                {fallbackText || t('common/table:fallback_text')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
