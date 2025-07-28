"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import AdminLayout from "@/components/admin/admin-layout";

// Import types
import {
  DataAgent,
  Environment,
  Relationship,
  NewEnvironment
} from "@/components/admin/data-agents/types";

// Import components
import DataAgentHeader from "@/components/admin/data-agents/DataAgentHeader";
import EnvironmentTabs from "@/components/admin/data-agents/EnvironmentTabs";
import EnvironmentHeader from "@/components/admin/data-agents/EnvironmentHeader";
import ContentTabs from "@/components/admin/data-agents/ContentTabs";
import OverviewTab from "@/components/admin/data-agents/OverviewTab";
import TablesTab from "@/components/admin/data-agents/TablesTab";
import RelationshipsTab from "@/components/admin/data-agents/RelationshipsTab";
import CreateEnvironmentModal from "@/components/admin/data-agents/CreateEnvironmentModal";
import ImportTablesModal from "@/components/admin/data-agents/ImportTablesModal";
import NoEnvironmentState from "@/components/admin/data-agents/NoEnvironmentState";
import EditCredentialsModal from "@/components/admin/data-agents/EditCredentialsModal";
import EditTableModal from "@/components/admin/data-agents/EditTableModal";
import EditRelationshipModal from "@/components/admin/data-agents/EditRelationshipModal";
import { EditDataAgentModal, EditEnvironmentModal } from "@/components/admin/data-agents";
import RelationshipDiagram from "@/components/admin/data-agents/RelationshipDiagram";
import { useNotifications } from "@/components/ui/NotificationContext";
import { NotificationProvider } from "@/components/ui/NotificationContext";
import NotificationContainer from "@/components/ui/NotificationContainer";

export default function DataAgentDetailPage() {
  return (
    <NotificationProvider>
      <DataAgentDetailPageContent />
      <NotificationContainer />
    </NotificationProvider>
  );
}

function DataAgentDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  
  // Main states
  const [dataAgent, setDataAgent] = useState<DataAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Environment and tab states
  const [activeEnvironmentId, setActiveEnvironmentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Environment creation states
  const [showCreateEnvironmentModal, setShowCreateEnvironmentModal] = useState(false);
  const [newEnvironment, setNewEnvironment] = useState<NewEnvironment>({
    name: '',
    description: '',
    customPrompt: '',
    environmentType: 'production',
    connectionConfig: {
      host: '',
      port: '5432',
      database: '',
      schema: ''
    },
    credentials: {
      username: '',
      password: ''
    }
  });
  const [creationConnectionTestResult, setCreationConnectionTestResult] = useState<{ success: boolean; error?: string; message?: string } | null>(null);
  
  // Environment editing states
  const [showEditCredentialsModal, setShowEditCredentialsModal] = useState(false);
  const [editingEnvironmentId, setEditingEnvironmentId] = useState<string>('');
  const [currentUsername, setCurrentUsername] = useState<string>('');
  const [savingCredentials, setSavingCredentials] = useState(false);
  
  // Table and import states
  const [availableTables, setAvailableTables] = useState<any[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [importingTables, setImportingTables] = useState(false);
  
  // Relationship states
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loadingRelationships, setLoadingRelationships] = useState(false);
  const [analyzingRelationships, setAnalyzingRelationships] = useState(false);
  
  // Environment tables state (for diagram)
  const [environmentTables, setEnvironmentTables] = useState<any[]>([]);
  const [loadingEnvironmentTables, setLoadingEnvironmentTables] = useState(false);
  
  // Connection test states
  const [testingConnection, setTestingConnection] = useState(false);
  const [deletingAgent, setDeletingAgent] = useState(false);
  const [deletingEnvironment, setDeletingEnvironment] = useState(false);
  
  // Table analysis states
  const [analyzingTableId, setAnalyzingTableId] = useState<string | null>(null);
  const [deletingTableId, setDeletingTableId] = useState<string | null>(null);
  
  // Table editing modal states
  const [showEditTableModal, setShowEditTableModal] = useState(false);
  const [selectedTableForEdit, setSelectedTableForEdit] = useState<any>(null);
  const [savingTable, setSavingTable] = useState(false);

  // Relationship editing modal states
  const [showEditRelationshipModal, setShowEditRelationshipModal] = useState(false);
  const [selectedRelationshipForEdit, setSelectedRelationshipForEdit] = useState<Relationship | null>(null);
  const [savingRelationship, setSavingRelationship] = useState(false);

  // Data agent editing modal states
  const [showEditDataAgentModal, setShowEditDataAgentModal] = useState(false);

  // Environment editing modal states
  const [showEditEnvironmentModal, setShowEditEnvironmentModal] = useState(false);
  const [selectedEnvironmentForEdit, setSelectedEnvironmentForEdit] = useState<Environment | null>(null);

  // Notification hook
  const { addNotification } = useNotifications();

  useEffect(() => {
    fetchDataAgent();
  }, [params.id]);

  useEffect(() => {
    if (dataAgent && dataAgent.environments && dataAgent.environments.length > 0 && !activeEnvironmentId) {
      setActiveEnvironmentId(dataAgent.environments[0].id);
    }
  }, [dataAgent, activeEnvironmentId]);

  useEffect(() => {
    if (activeTab === 'relationships' && activeEnvironmentId) {
      fetchRelationships();
      fetchEnvironmentTables();
    }
  }, [activeTab, activeEnvironmentId]);

  const fetchDataAgent = async () => {
    try {
      const response = await fetch(`/api/admin/data-agents/${params.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch data agent");
      }
      const data = await response.json();
      setDataAgent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data agent");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentEnvironment = (): Environment | null => {
    if (!dataAgent || !activeEnvironmentId) return null;
    return dataAgent.environments.find(env => env.id === activeEnvironmentId) || null;
  };

  const handleCreateEnvironment = async () => {
    if (!dataAgent) return;
    
    try {
      // Prepare the payload with connection test result status
      const payload = {
        ...newEnvironment,
        // Merge credentials into connectionConfig for the API
        connectionConfig: {
          ...newEnvironment.connectionConfig,
          username: newEnvironment.credentials.username,
          password: newEnvironment.credentials.password
        },
        connectionTested: creationConnectionTestResult?.success || false
      };

      const response = await fetch(`/api/admin/data-agents/${dataAgent.id}/environments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const environment = await response.json();
        setShowCreateEnvironmentModal(false);
        setNewEnvironment({
          name: '',
          description: '',
          customPrompt: '',
          environmentType: 'production',
          connectionConfig: {
            host: '',
            port: '5432',
            database: '',
            schema: ''
          },
          credentials: {
            username: '',
            password: ''
          }
        });
        setCreationConnectionTestResult(null);
        await fetchDataAgent();
        setActiveEnvironmentId(environment.id);
        addNotification({
          type: 'success',
          title: 'Environment Created',
          message: 'Environment has been created successfully.'
        });
      } else {
        const errorData = await response.json();
        addNotification({
          type: 'error',
          title: 'Creation Failed',
          message: errorData.error || 'Failed to create environment'
        });
      }
    } catch (error) {
      console.error('Error creating environment:', error);
      addNotification({
        type: 'error',
        title: 'Environment Creation Failed',
        message: 'An error occurred while creating the environment'
      });
    }
  };

  const handleTestConnectionDuringCreation = async (environment: NewEnvironment): Promise<{ success: boolean; error?: string; message?: string }> => {
    if (!dataAgent) {
      return { success: false, error: 'Data agent not found' };
    }

    try {
      // Create a test payload with the connection details
      const testPayload = {
        connectionType: dataAgent.connectionType,
        connectionConfig: environment.connectionConfig,
        credentials: environment.credentials
      };

      const response = await fetch(`/api/admin/data-agents/${dataAgent.id}/test-connection-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        const result = await response.json();
        setCreationConnectionTestResult(result);
        return result;
      } else {
        const errorData = await response.json();
        const result = { success: false, error: errorData.error || 'Connection test failed' };
        setCreationConnectionTestResult(result);
        return result;
      }
    } catch (error) {
      console.error('Error testing connection during creation:', error);
      const result = { success: false, error: 'Failed to test connection' };
      setCreationConnectionTestResult(result);
      return result;
    }
  };

  const handleEditCredentials = async (environmentId: string) => {
    try {
      // Fetch current credentials
      const response = await fetch(`/api/admin/data-agents/${params.id}/environments/${environmentId}`);
      if (response.ok) {
        const data = await response.json();
        setEditingEnvironmentId(environmentId);
        setCurrentUsername(data.credentials?.username || '');
        setShowEditCredentialsModal(true);
      } else {
        addNotification({
          type: 'error',
          title: 'Failed to Load Credentials',
          message: 'Unable to load environment credentials'
        });
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
      addNotification({
        type: 'error',
        title: 'Credentials Load Error',
        message: 'An error occurred while loading credentials'
      });
    }
  };

  const handleSaveCredentials = async (credentials: { username: string; password: string }) => {
    setSavingCredentials(true);
    try {
      const response = await fetch(`/api/admin/data-agents/${params.id}/environments/${editingEnvironmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (response.ok) {
        addNotification({
          type: 'success',
          title: 'Credentials Updated',
          message: 'Environment credentials updated successfully'
        });
        setShowEditCredentialsModal(false);
        setEditingEnvironmentId('');
        setCurrentUsername('');
        await fetchDataAgent();
      } else {
        const errorData = await response.json();
        addNotification({
          type: 'error',
          title: 'Update Failed',
          message: errorData.error || 'Failed to update environment credentials'
        });
      }
    } catch (error) {
      console.error('Error updating credentials:', error);
      addNotification({
        type: 'error',
        title: 'Update Error',
        message: 'An error occurred while updating credentials'
      });
    } finally {
      setSavingCredentials(false);
    }
  };

  const handleEditDataAgent = () => {
    setShowEditDataAgentModal(true);
  };

  const handleUpdateDataAgent = (updatedAgent: DataAgent) => {
    setDataAgent(updatedAgent);
    addNotification({
      type: 'success',
      title: 'Data Agent Updated',
      message: 'Data agent has been updated successfully.'
    });
  };

  const handleEditEnvironment = () => {
    const currentEnv = getCurrentEnvironment();
    if (currentEnv) {
      setSelectedEnvironmentForEdit(currentEnv);
      setShowEditEnvironmentModal(true);
    }
  };

  const handleUpdateEnvironment = (updatedEnvironment: Environment) => {
    if (dataAgent) {
      const updatedEnvironments = dataAgent.environments.map(env => 
        env.id === updatedEnvironment.id ? updatedEnvironment : env
      );
      setDataAgent({
        ...dataAgent,
        environments: updatedEnvironments
      });
      setSelectedEnvironmentForEdit(null);
      addNotification({
        type: 'success',
        title: 'Environment Updated',
        message: 'Environment has been updated successfully.'
      });
    }
  };

  const handleTestConnection = async () => {
    if (!activeEnvironmentId) return;
    
    setTestingConnection(true);
    try {
      const response = await fetch(`/api/admin/data-agents/${params.id}/environments/${activeEnvironmentId}/test-connection`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          addNotification({
            type: 'success',
            title: 'Connection Successful',
            message: 'Database connection established successfully!'
          });
        } else {
          addNotification({
            type: 'error',
            title: 'Connection Failed',
            message: result.error || 'Failed to connect to database'
          });
        }
        if (result.success) {
          await fetchDataAgent();
        }
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      addNotification({
        type: 'error',
        title: 'Connection Test Failed',
        message: 'An error occurred while testing the connection'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleFetchAvailableTables = async () => {
    if (!activeEnvironmentId) return;
    
    setLoadingTables(true);
    try {
      const response = await fetch(`/api/admin/data-agents/${params.id}/environments/${activeEnvironmentId}/tables/available`);
      if (response.ok) {
        const tables = await response.json();
        setAvailableTables(tables);
        setShowImportModal(true);
      }
    } catch (err) {
      console.error('Failed to fetch available tables:', err);
      addNotification({
        type: 'error',
        title: 'Table Fetch Failed',
        message: 'Unable to fetch available database tables'
      });
    } finally {
      setLoadingTables(false);
    }
  };

  const handleImportTables = async () => {
    if (!activeEnvironmentId || selectedTables.length === 0) return;
    
    setImportingTables(true);
    try {
      const response = await fetch(`/api/admin/data-agents/${params.id}/environments/${activeEnvironmentId}/tables/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tables: selectedTables }),
      });

      if (response.ok) {
        setShowImportModal(false);
        setSelectedTables([]);
        await fetchDataAgent();
        await fetchEnvironmentTables(); // Update tables for diagram
        addNotification({
          type: 'success',
          title: 'Import Successful',
          message: 'Tables imported successfully!'
        });
      } else {
        const errorData = await response.json();
        addNotification({
          type: 'error',
          title: 'Import Failed',
          message: errorData.error || 'Failed to import tables'
        });
      }
    } catch (error) {
      console.error('Error importing tables:', error);
      addNotification({
        type: 'error',
        title: 'Import Error',
        message: 'An error occurred while importing tables'
      });
    } finally {
      setImportingTables(false);
    }
  };

  const fetchRelationships = async () => {
    if (!activeEnvironmentId) return;
    
    console.log('fetchRelationships - activeEnvironmentId:', activeEnvironmentId);
    console.log('fetchRelationships - params.id:', params.id);
    
    setLoadingRelationships(true);
    try {
      const url = `/api/admin/data-agents/${params.id}/environments/${activeEnvironmentId}/relationships`;
      console.log('fetchRelationships - URL:', url);
      
      const response = await fetch(url);
      console.log('fetchRelationships - response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('fetchRelationships - full response data:', data);
        console.log('fetchRelationships - data.relationships:', data.relationships);
        setRelationships(data.relationships || []);
      } else {
        console.error('fetchRelationships - response not ok:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('fetchRelationships - error text:', errorText);
      }
    } catch (err) {
      console.error('Failed to fetch relationships:', err);
    } finally {
      setLoadingRelationships(false);
    }
  };

  const fetchEnvironmentTables = async () => {
    if (!activeEnvironmentId) return;
    
    setLoadingEnvironmentTables(true);
    try {
      const response = await fetch(`/api/admin/data-agents/${params.id}/environments/${activeEnvironmentId}/tables`);
      if (response.ok) {
        const data = await response.json();
        setEnvironmentTables(data.tables || []);
      } else {
        console.error('Failed to fetch environment tables:', response.status);
      }
    } catch (err) {
      console.error('Failed to fetch environment tables:', err);
    } finally {
      setLoadingEnvironmentTables(false);
    }
  };

  const handleAnalyzeRelationships = async () => {
    if (!activeEnvironmentId) return;
    
    setAnalyzingRelationships(true);
    try {
      const response = await fetch(`/api/admin/data-agents/${params.id}/environments/${activeEnvironmentId}/relationships/analyze`, {
        method: 'POST'
      });
      
      if (response.ok) {
        await fetchDataAgent();
        await fetchRelationships();
        addNotification({
          type: 'success',
          title: 'Analysis Complete',
          message: 'Relationship analysis completed successfully!'
        });
      } else {
        addNotification({
          type: 'error',
          title: 'Analysis Failed',
          message: 'Failed to analyze relationships'
        });
      }
    } catch (error) {
      console.error('Error analyzing relationships:', error);
      addNotification({
        type: 'error',
        title: 'Analysis Error',
        message: 'An error occurred while analyzing relationships'
      });
    } finally {
      setAnalyzingRelationships(false);
    }
  };

  const handleDeleteEnvironment = async () => {
    if (!activeEnvironmentId) return;
    
    if (!confirm('Are you sure you want to delete this environment? This will also remove all associated data from the vault.')) {
      return;
    }
    
    setDeletingEnvironment(true);
    try {
      const response = await fetch(`/api/admin/data-agents/${params.id}/environments/${activeEnvironmentId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchDataAgent();
        
        // Switch to another environment if available
        const remainingEnvs = dataAgent?.environments.filter(env => env.id !== activeEnvironmentId);
        if (remainingEnvs && remainingEnvs.length > 0) {
          setActiveEnvironmentId(remainingEnvs[0].id);
        } else {
          setActiveEnvironmentId(null);
        }
        
        addNotification({
          type: 'success',
          title: 'Environment Deleted',
          message: 'Environment deleted successfully'
        });
      } else {
        const errorData = await response.json();
        addNotification({
          type: 'error',
          title: 'Delete Failed',
          message: errorData.error || 'Failed to delete environment'
        });
      }
    } catch (error) {
      console.error('Error deleting environment:', error);
      addNotification({
        type: 'error',
        title: 'Delete Error',
        message: 'An error occurred while deleting the environment'
      });
    } finally {
      setDeletingEnvironment(false);
    }
  };

  const handleDeleteDataAgent = async () => {
    if (!dataAgent) return;
    
    if (!confirm(`Are you sure you want to delete the data agent "${dataAgent.name}"? This will remove all environments, tables, relationships, and vault data. This action cannot be undone.`)) {
      return;
    }
    
    setDeletingAgent(true);
    try {
      const response = await fetch(`/api/admin/data-agents/${dataAgent.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        addNotification({
          type: 'success',
          title: 'Data Agent Deleted',
          message: 'Data agent deleted successfully'
        });
        router.push('/admin/data-agents');
      } else {
        const errorData = await response.json();
        addNotification({
          type: 'error',
          title: 'Delete Failed',
          message: errorData.error || 'Failed to delete data agent'
        });
      }
    } catch (error) {
      console.error('Error deleting data agent:', error);
      addNotification({
        type: 'error',
        title: 'Delete Error',
        message: 'An error occurred while deleting the data agent'
      });
    } finally {
      setDeletingAgent(false);
    }
  };

  const handleAnalyzeTable = async (tableId: string) => {
    console.log('🚀 FRONTEND: Starting table analysis for tableId:', tableId, 'environmentId:', activeEnvironmentId);
    if (!activeEnvironmentId) return;
    
    setAnalyzingTableId(tableId);
    try {
      const apiUrl = `/api/admin/data-agents/${params.id}/environments/${activeEnvironmentId}/tables/${tableId}/analyze`;
      console.log('🚀 FRONTEND: Calling API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Update the table data directly in state instead of refetching everything
        if (result.updatedTable && dataAgent) {
          setDataAgent(prev => prev ? {
            ...prev,
            environments: prev.environments.map(env => 
              env.id === activeEnvironmentId ? {
                ...env,
                tables: env.tables?.map(table => 
                  table.id === tableId ? result.updatedTable : table
                ) || []
              } : env
            )
          } : null);
        }
        
        addNotification({
          type: 'success',
          title: 'Analysis Complete',
          message: 'Table analysis completed successfully!'
        });
      } else {
        const errorData = await response.json();
        addNotification({
          type: 'error',
          title: 'Analysis Failed',
          message: errorData.error || 'Failed to analyze table. Please try again.'
        });
      }
    } catch (error) {
      console.error('Error analyzing table:', error);
      addNotification({
        type: 'error',
        title: 'Analysis Error',
        message: 'An error occurred while analyzing the table.'
      });
    } finally {
      setAnalyzingTableId(null);
    }
  };

  const handleViewEditTable = async (tableId: string) => {
    // Navigate to the full page for view/edit
    router.push(`/admin/data-agents/tables/${tableId}`);
  };

  const handleDeleteTable = async (tableId: string) => {
    setDeletingTableId(tableId);
    try {
      const response = await fetch(`/api/admin/data-agents/tables/${tableId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchDataAgent();
        addNotification({
          type: 'success',
          title: 'Table Deleted',
          message: 'Table has been deleted successfully.'
        });
      } else {
        const errorData = await response.json();
        addNotification({
          type: 'error',
          title: 'Delete Failed',
          message: errorData.error || 'Failed to delete table'
        });
      }
    } catch (error) {
      console.error('Error deleting table:', error);
      addNotification({
        type: 'error',
        title: 'Delete Error',
        message: 'An error occurred while deleting the table.'
      });
    } finally {
      setDeletingTableId(null);
    }
  };

  const handleSaveTable = async (tableId: string, updates: any) => {
    setSavingTable(true);
    try {
      const response = await fetch(`/api/admin/data-agents/tables/${tableId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        addNotification({
          type: 'success',
          title: 'Table Updated',
          message: 'Table has been updated successfully.'
        });
        setShowEditTableModal(false);
        setSelectedTableForEdit(null);
        await fetchDataAgent();
      } else {
        addNotification({
          type: 'error',
          title: 'Update Failed',
          message: 'Failed to update table. Please try again.'
        });
      }
    } catch (error) {
      console.error('Error updating table:', error);
      addNotification({
        type: 'error',
        title: 'Update Error',
        message: 'An error occurred while updating the table.'
      });
    } finally {
      setSavingTable(false);
    }
  };

  const handleVerifyRelationship = async (relationshipId: string, isVerified: boolean) => {
    try {
      const response = await fetch(`/api/admin/data-agents/${params.id}/relationships/${relationshipId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isVerified }),
      });

      if (response.ok) {
        await fetchRelationships(); // Refresh the relationships list
        addNotification({
          type: 'success',
          title: 'Relationship Updated',
          message: `Relationship has been ${isVerified ? 'verified' : 'unverified'} successfully.`
        });
      } else {
        addNotification({
          type: 'error',
          title: 'Update Failed',
          message: 'Failed to update relationship verification status.'
        });
      }
    } catch (error) {
      console.error('Error updating relationship:', error);
      addNotification({
        type: 'error',
        title: 'Update Error',
        message: 'An error occurred while updating the relationship.'
      });
    }
  };

  const handleEditRelationship = (relationship: Relationship) => {
    setSelectedRelationshipForEdit(relationship);
    setShowEditRelationshipModal(true);
  };

  const handleSaveRelationship = async (relationshipId: string, updates: any) => {
    if (!dataAgent) return;

    setSavingRelationship(true);
    try {
      const response = await fetch(
        `/api/admin/data-agents/${dataAgent.id}/relationships/${relationshipId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update relationship');
      }

      const updated = await response.json();
      
      // Update the relationships in state
      setRelationships(prev => prev.map(rel => 
        rel.id === relationshipId ? { ...rel, ...updated } : rel
      ));

      addNotification({
        type: 'success',
        title: 'Relationship Updated',
        message: 'The relationship has been successfully updated.'
      });

      setShowEditRelationshipModal(false);
      setSelectedRelationshipForEdit(null);
    } catch (error) {
      console.error('Error updating relationship:', error);
      addNotification({
        type: 'error',
        title: 'Update Error',
        message: 'Failed to update the relationship. Please try again.'
      });
    } finally {
      setSavingRelationship(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !dataAgent) {
    return (
      <AdminLayout>
        <div className="text-center py-8">
          <p className="text-red-600">{error || "Data agent not found"}</p>
        </div>
      </AdminLayout>
    );
  }

  const currentEnvironment = getCurrentEnvironment();

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto py-6">
        {/* Header */}
        <DataAgentHeader
          dataAgent={dataAgent}
          onCreateEnvironment={() => setShowCreateEnvironmentModal(true)}
          onDeleteAgent={handleDeleteDataAgent}
          onEditAgent={handleEditDataAgent}
          deletingAgent={deletingAgent}
        />

        {/* Environment Section - Combined Tabs and Content */}
        {dataAgent.environments && dataAgent.environments.length > 0 && currentEnvironment ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            {/* Environment Tabs - Top of the card */}
            <EnvironmentTabs
              environments={dataAgent.environments}
              activeEnvironmentId={activeEnvironmentId}
              onEnvironmentChange={setActiveEnvironmentId}
            />
            
            {/* Environment Header - Connected to tabs */}
            <EnvironmentHeader
              environment={currentEnvironment}
              onTestConnection={handleTestConnection}
              onImportTables={handleFetchAvailableTables}
              onDeleteEnvironment={handleDeleteEnvironment}
              onEditCredentials={() => handleEditCredentials(currentEnvironment.id)}
              onEditEnvironment={handleEditEnvironment}
              testingConnection={testingConnection}
              loadingTables={loadingTables}
              deletingEnvironment={deletingEnvironment}
            />

            {/* Content Tabs */}
            <ContentTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            {/* Tab Content */}
            <div className="px-6 py-6">
              {activeTab === 'overview' && (
                <OverviewTab environment={currentEnvironment} />
              )}

              {activeTab === 'tables' && (
                <TablesTab
                  environment={currentEnvironment}
                  onImportTables={handleFetchAvailableTables}
                  loadingTables={loadingTables}
                  onAnalyzeTable={handleAnalyzeTable}
                  onViewEditTable={handleViewEditTable}
                  onDeleteTable={handleDeleteTable}
                  analyzingTableId={analyzingTableId}
                  deletingTableId={deletingTableId}
                />
              )}

              {activeTab === 'relationships' && (
                <div className="space-y-6">
                  {/* Relationship Diagram */}
                  <RelationshipDiagram
                    environment={currentEnvironment}
                    tables={environmentTables}
                    relationships={relationships}
                  />
                  
                  {/* Relationships Tab */}
                  <RelationshipsTab
                    environment={currentEnvironment}
                    relationships={relationships}
                    loadingRelationships={loadingRelationships}
                    analyzingRelationships={analyzingRelationships}
                    onAnalyzeRelationships={handleAnalyzeRelationships}
                    onVerifyRelationship={handleVerifyRelationship}
                    onEditRelationship={handleEditRelationship}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <NoEnvironmentState onCreateEnvironment={() => setShowCreateEnvironmentModal(true)} />
        )}

        {/* Modals */}
        <CreateEnvironmentModal
          isOpen={showCreateEnvironmentModal}
          newEnvironment={newEnvironment}
          dataAgent={dataAgent}
          onClose={() => {
            setShowCreateEnvironmentModal(false);
            setCreationConnectionTestResult(null);
          }}
          onCreate={handleCreateEnvironment}
          onChange={setNewEnvironment}
          onTestConnection={handleTestConnectionDuringCreation}
        />

        <ImportTablesModal
          isOpen={showImportModal}
          availableTables={availableTables}
          selectedTables={selectedTables}
          importingTables={importingTables}
          onClose={() => setShowImportModal(false)}
          onImport={handleImportTables}
          onSelectionChange={setSelectedTables}
        />

        <EditCredentialsModal
          isOpen={showEditCredentialsModal}
          environmentId={editingEnvironmentId}
          currentUsername={currentUsername}
          onClose={() => {
            setShowEditCredentialsModal(false);
            setEditingEnvironmentId('');
            setCurrentUsername('');
          }}
          onSave={handleSaveCredentials}
          saving={savingCredentials}
          onError={(message) => {
            addNotification({
              type: 'error',
              title: 'Validation Error',
              message: message
            });
          }}
        />

        <EditTableModal
          isOpen={showEditTableModal}
          table={selectedTableForEdit}
          onClose={() => {
            setShowEditTableModal(false);
            setSelectedTableForEdit(null);
          }}
          onSave={handleSaveTable}
          saving={savingTable}
        />

        <EditRelationshipModal
          isOpen={showEditRelationshipModal}
          relationship={selectedRelationshipForEdit}
          onClose={() => {
            setShowEditRelationshipModal(false);
            setSelectedRelationshipForEdit(null);
          }}
          onSave={handleSaveRelationship}
          saving={savingRelationship}
        />

        {dataAgent && (
          <EditDataAgentModal
            isOpen={showEditDataAgentModal}
            dataAgent={dataAgent}
            onClose={() => setShowEditDataAgentModal(false)}
            onUpdate={handleUpdateDataAgent}
          />
        )}

        {selectedEnvironmentForEdit && (
          <EditEnvironmentModal
            isOpen={showEditEnvironmentModal}
            environment={selectedEnvironmentForEdit}
            onClose={() => {
              setShowEditEnvironmentModal(false);
              setSelectedEnvironmentForEdit(null);
            }}
            onUpdate={handleUpdateEnvironment}
          />
        )}
      </div>
    </AdminLayout>
  );
}
