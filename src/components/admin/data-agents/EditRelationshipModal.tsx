import { useState, useEffect } from 'react';
import { Relationship } from './types';

interface EditRelationshipModalProps {
  isOpen: boolean;
  relationship: Relationship | null;
  onClose: () => void;
  onSave: (relationshipId: string, updates: any) => void;
  saving: boolean;
}

export default function EditRelationshipModal({
  isOpen,
  relationship,
  onClose,
  onSave,
  saving
}: EditRelationshipModalProps) {
  const [description, setDescription] = useState('');
  const [example, setExample] = useState('');
  const [relationshipType, setRelationshipType] = useState('');
  const [confidence, setConfidence] = useState<number>(0);

  useEffect(() => {
    if (relationship) {
      setDescription(relationship.description || '');
      setExample(relationship.example || '');
      setRelationshipType(relationship.relationshipType || '');
      setConfidence(relationship.confidence || 0);
    }
  }, [relationship]);

  if (!isOpen || !relationship) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(relationship.id, {
      description: description.trim() || null,
      example: example.trim() || null,
      relationshipType,
      confidence: confidence / 100, // Convert percentage back to decimal
    });
  };

  const relationshipTypes = [
    { value: 'one_to_one', label: 'One to One' },
    { value: 'one_to_many', label: 'One to Many' },
    { value: 'many_to_many', label: 'Many to Many' },
    { value: 'many_to_one', label: 'Many to One' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Edit Relationship</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {relationship.sourceTable?.tableName || `Table ${relationship.sourceTableId}`}.{relationship.sourceColumn} → {relationship.targetTable?.tableName || `Table ${relationship.targetTableId}`}.{relationship.targetColumn}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            {/* Relationship Type */}
            <div>
              <label htmlFor="relationshipType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Relationship Type
              </label>
              <select
                id="relationshipType"
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                required
              >
                <option value="">Select relationship type</option>
                {relationshipTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Describe this relationship..."
              />
            </div>

            {/* Example */}
            <div>
              <label htmlFor="example" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Example Query/Usage
              </label>
              <textarea
                id="example"
                value={example}
                onChange={(e) => setExample(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 font-mono text-sm"
                placeholder="SELECT * FROM table1 t1 JOIN table2 t2 ON t1.id = t2.table1_id"
              />
            </div>

            {/* Confidence */}
            <div>
              <label htmlFor="confidence" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confidence: {Math.round(confidence)}%
              </label>
              <input
                type="range"
                id="confidence"
                min="0"
                max="100"
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !relationshipType}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
