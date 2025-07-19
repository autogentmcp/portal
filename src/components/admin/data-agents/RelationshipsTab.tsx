import { Relationship, Environment } from './types';

interface RelationshipsTabProps {
  environment: Environment;
  relationships: Relationship[];
  loadingRelationships: boolean;
  analyzingRelationships: boolean;
  onAnalyzeRelationships: () => void;
}

export default function RelationshipsTab({
  environment,
  relationships,
  loadingRelationships,
  analyzingRelationships,
  onAnalyzeRelationships
}: RelationshipsTabProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Relationships</h3>
        <button
          onClick={onAnalyzeRelationships}
          disabled={analyzingRelationships}
          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
        >
          {analyzingRelationships ? 'Analyzing...' : 'Analyze Relationships'}
        </button>
      </div>
      
      {loadingRelationships ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : relationships.length > 0 ? (
        <div className="grid gap-4">
          {relationships.map((relationship) => (
            <div key={relationship.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {relationship.sourceTable.tableName}.{relationship.sourceColumn} → {relationship.targetTable.tableName}.{relationship.targetColumn}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {relationship.relationshipType.replace('_', ' ')}
                  </p>
                  {relationship.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{relationship.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {relationship.confidence && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {Math.round(relationship.confidence * 100)}% confidence
                    </span>
                  )}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    relationship.isVerified 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                  }`}>
                    {relationship.isVerified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No relationships found yet.</p>
          <button
            onClick={onAnalyzeRelationships}
            disabled={analyzingRelationships || !environment.tables || environment.tables.length < 2}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
          >
            {analyzingRelationships ? 'Analyzing...' : 'Analyze Relationships'}
          </button>
          {(!environment.tables || environment.tables.length < 2) && (
            <p className="text-xs text-gray-400 mt-2">Import at least 2 tables to analyze relationships</p>
          )}
        </div>
      )}
    </div>
  );
}
