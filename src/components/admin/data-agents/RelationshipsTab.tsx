import { Relationship, Environment } from './types';

interface RelationshipsTabProps {
  environment: Environment;
  relationships: Relationship[];
  loadingRelationships: boolean;
  analyzingRelationships: boolean;
  onAnalyzeRelationships: () => void;
  onVerifyRelationship?: (relationshipId: string, isVerified: boolean) => void;
  onEditRelationship?: (relationship: Relationship) => void;
}

export default function RelationshipsTab({
  environment,
  relationships,
  loadingRelationships,
  analyzingRelationships,
  onAnalyzeRelationships,
  onVerifyRelationship,
  onEditRelationship
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
          {relationships.map((relationship) => {
            // Debug each relationship
            console.log('Rendering relationship:', relationship);
            
            // Safely get table names with fallbacks
            const sourceTableName = relationship.sourceTable?.tableName || `Table ID: ${relationship.sourceTableId}`;
            const targetTableName = relationship.targetTable?.tableName || `Table ID: ${relationship.targetTableId}`;
            
            return (
              <div key={relationship.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {sourceTableName}.{relationship.sourceColumn} → {targetTableName}.{relationship.targetColumn}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {relationship.relationshipType.replace('_', ' ')}
                    </p>
                    {relationship.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{relationship.description}</p>
                    )}
                    
                    {/* Show example if it exists */}
                    {relationship.example && (
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                        <p className="text-gray-600 dark:text-gray-400 font-medium">Example:</p>
                        <code className="text-gray-800 dark:text-gray-200">{relationship.example}</code>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {relationship.confidence && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.round(relationship.confidence * 100)}% confidence
                      </span>
                    )}
                    
                    {/* Verification Status and Button */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        relationship.isVerified 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                      }`}>
                        {relationship.isVerified ? 'Verified' : 'Unverified'}
                      </span>
                      
                      {/* Verify/Unverify Button */}
                      {onVerifyRelationship && (
                        <button
                          onClick={() => onVerifyRelationship(relationship.id, !relationship.isVerified)}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${
                            relationship.isVerified
                              ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-600 dark:text-yellow-400 dark:hover:bg-yellow-900/20'
                              : 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/20'
                          }`}
                        >
                          {relationship.isVerified ? 'Unverify' : 'Verify'}
                        </button>
                      )}
                      
                      {/* Edit Button */}
                      {onEditRelationship && (
                        <button
                          onClick={() => onEditRelationship(relationship)}
                          className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
