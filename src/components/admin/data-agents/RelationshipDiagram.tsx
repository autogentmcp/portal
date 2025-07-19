import { Relationship, Environment } from './types';
import { useState } from 'react';

interface RelationshipDiagramProps {
  environment: Environment;
  tables: any[];
  relationships: Relationship[];
}

export default function RelationshipDiagram({
  environment,
  tables,
  relationships
}: RelationshipDiagramProps) {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  if (!tables || tables.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">No tables available to display relationships.</p>
      </div>
    );
  }

  // Create a map of table positions in a grid layout
  const columns = Math.ceil(Math.sqrt(tables.length));
  const tableWidth = 200;
  const tableHeight = 100;
  const padding = 50;
  const spacing = 100;

  const svgWidth = columns * (tableWidth + spacing) + padding * 2;
  const svgHeight = Math.ceil(tables.length / columns) * (tableHeight + spacing) + padding * 2;

  const getTablePosition = (index: number) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    return {
      x: padding + col * (tableWidth + spacing),
      y: padding + row * (tableHeight + spacing)
    };
  };

  const getRelationshipType = (type: string) => {
    switch (type) {
      case 'one_to_one':
        return '1:1';
      case 'one_to_many':
        return '1:N';
      case 'many_to_many':
        return 'N:N';
      case 'many_to_one':
        return 'N:1';
      default:
        return type;
    }
  };

  const getConnectionPoint = (tableIndex: number, isSource: boolean) => {
    const pos = getTablePosition(tableIndex);
    return {
      x: pos.x + (isSource ? tableWidth : 0),
      y: pos.y + tableHeight / 2
    };
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Relationship Diagram</h4>
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Table</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1 bg-green-500"></div>
            <span>Verified</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1 bg-yellow-500"></div>
            <span>Unverified</span>
          </div>
        </div>
      </div>

      <div className="overflow-auto">
        <svg width={svgWidth} height={svgHeight} className="border border-gray-100 dark:border-gray-600 rounded">
          {/* Background */}
          <rect width="100%" height="100%" fill="transparent" />
          
          {/* Relationship lines */}
          {relationships.map((relationship, index) => {
            const sourceTableIndex = tables.findIndex(t => t.id === relationship.sourceTableId);
            const targetTableIndex = tables.findIndex(t => t.id === relationship.targetTableId);
            
            if (sourceTableIndex === -1 || targetTableIndex === -1) return null;
            
            const sourcePoint = getConnectionPoint(sourceTableIndex, true);
            const targetPoint = getConnectionPoint(targetTableIndex, false);
            
            // Calculate curve for better visibility
            const midX = (sourcePoint.x + targetPoint.x) / 2;
            const midY = (sourcePoint.y + targetPoint.y) / 2;
            const curvature = 50;
            
            // Check if this relationship is connected to the selected table
            const isHighlighted = selectedTable && 
              (relationship.sourceTableId === selectedTable || relationship.targetTableId === selectedTable);
            
            // Determine colors based on verification and selection state
            const baseColor = relationship.isVerified ? "#10b981" : "#f59e0b";
            const strokeColor = isHighlighted ? "#3b82f6" : (selectedTable ? "#6b7280" : baseColor);
            const strokeWidth = isHighlighted ? "3" : "2";
            const opacity = selectedTable && !isHighlighted ? 0.3 : 1;
            
            return (
              <g key={relationship.id} style={{ opacity }}>
                {/* Connection line */}
                <path
                  d={`M ${sourcePoint.x} ${sourcePoint.y} Q ${midX} ${midY - curvature} ${targetPoint.x} ${targetPoint.y}`}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={relationship.isVerified ? "none" : "5,5"}
                />
                
                {/* Arrowhead */}
                <polygon
                  points={`${targetPoint.x},${targetPoint.y} ${targetPoint.x - 8},${targetPoint.y - 4} ${targetPoint.x - 8},${targetPoint.y + 4}`}
                  fill={strokeColor}
                />
                
                {/* Relationship type label */}
                <text
                  x={midX}
                  y={midY - curvature - 10}
                  textAnchor="middle"
                  className="text-xs fill-gray-600 dark:fill-gray-300"
                  fontSize="10"
                  style={{ opacity: selectedTable && !isHighlighted ? 0.5 : 1 }}
                >
                  {getRelationshipType(relationship.relationshipType)}
                </text>
                
                {/* Confidence indicator */}
                {relationship.confidence && (
                  <text
                    x={midX}
                    y={midY - curvature + 5}
                    textAnchor="middle"
                    className="text-xs fill-gray-500 dark:fill-gray-400"
                    fontSize="8"
                    style={{ opacity: selectedTable && !isHighlighted ? 0.5 : 1 }}
                  >
                    {Math.round(relationship.confidence * 100)}%
                  </text>
                )}
              </g>
            );
          })}
          
          {/* Tables */}
          {tables.map((table, index) => {
            const pos = getTablePosition(index);
            const isSelected = selectedTable === table.id;
            const relatedRelationships = relationships.filter(
              r => r.sourceTableId === table.id || r.targetTableId === table.id
            );
            
            // Check if this table is connected to the selected table
            const isConnected = selectedTable && relatedRelationships.some(
              r => (r.sourceTableId === selectedTable && r.targetTableId === table.id) ||
                   (r.targetTableId === selectedTable && r.sourceTableId === table.id)
            );
            
            // Determine table styling based on selection state
            const opacity = selectedTable && !isSelected && !isConnected ? 0.4 : 1;
            const fillColor = isSelected ? "#1e40af" : (isConnected ? "#059669" : "#374151");
            const strokeColor = isSelected ? "#3b82f6" : (isConnected ? "#10b981" : "#6b7280");
            const strokeWidth = isSelected ? "2" : (isConnected ? "2" : "1");
            
            return (
              <g key={table.id} style={{ opacity }}>
                {/* Table rectangle */}
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={tableWidth}
                  height={tableHeight}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  rx="8"
                  className="cursor-pointer"
                  onClick={() => setSelectedTable(isSelected ? null : table.id)}
                />
                
                {/* Table name */}
                <text
                  x={pos.x + tableWidth / 2}
                  y={pos.y + 25}
                  textAnchor="middle"
                  className="text-sm font-medium fill-white"
                  fontSize="14"
                >
                  {table.tableName}
                </text>
                
                {/* Table description */}
                {table.description && (
                  <text
                    x={pos.x + tableWidth / 2}
                    y={pos.y + 45}
                    textAnchor="middle"
                    className="text-xs fill-gray-200"
                    fontSize="10"
                  >
                    {table.description.length > 30 ? `${table.description.substring(0, 30)}...` : table.description}
                  </text>
                )}
                
                {/* Relationship count */}
                <text
                  x={pos.x + tableWidth / 2}
                  y={pos.y + 70}
                  textAnchor="middle"
                  className="text-xs fill-blue-300"
                  fontSize="10"
                >
                  {relatedRelationships.length} relationship{relatedRelationships.length !== 1 ? 's' : ''}
                </text>
                
                {/* Row count if available */}
                {table.rowCount && (
                  <text
                    x={pos.x + tableWidth / 2}
                    y={pos.y + 85}
                    textAnchor="middle"
                    className="text-xs fill-gray-300"
                    fontSize="9"
                  >
                    {table.rowCount.toLocaleString()} rows
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      
      {/* Legend and instructions */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>• Click on a table to highlight its relationships</p>
        <p>• Solid lines represent verified relationships, dashed lines are unverified</p>
        <p>• Numbers show relationship type (1:1, 1:N, N:N, N:1) and confidence percentage</p>
      </div>
    </div>
  );
}
