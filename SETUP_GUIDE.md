# Data Agent & LLM Setup Guide

## Overview
This implementation provides:
1. **Test Connection**: Working database connection testing for all supported database types
2. **LLM Integration**: OpenAI/Ollama support for table and field analysis
3. **Table Import**: Automatic table schema discovery and import
4. **AI Analysis**: LLM-powered analysis of tables and fields
5. **Complete UI**: Full workflow from data agent creation to detailed table analysis

## Environment Setup

### 1. Database Connection
The system supports enterprise-grade database types for production use:
- **PostgreSQL** - Most popular open-source database
- **MySQL** - Widely used relational database
- **Microsoft SQL Server** - Enterprise database solution
- **Google BigQuery** - Cloud data warehouse
- **Databricks** - Analytics platform

### 2. LLM Configuration
Add these environment variables to your `.env` file:

```bash
# LLM Configuration
LLM_PROVIDER="ollama"  # Options: "openai", "ollama"
LLM_API_KEY_ENV_VAR=""  # Environment variable name containing API key (for OpenAI)
LLM_BASE_URL="http://localhost:11434"  # Ollama URL or custom OpenAI endpoint
LLM_MODEL="llama3.2"  # Model name

# For security, set your actual API key as a separate environment variable:
# OPENAI_API_KEY="your-actual-api-key-here"  # Example API key variable
```

### 3. For OpenAI Setup:
```bash
LLM_PROVIDER="openai"
LLM_API_KEY_ENV_VAR="OPENAI_API_KEY"  # Name of environment variable containing your API key
LLM_BASE_URL=""  # Leave empty to use default OpenAI endpoint
LLM_MODEL="gpt-4"

# Set your actual API key in a separate environment variable for security:
OPENAI_API_KEY="your-openai-api-key"
```

### 4. For Ollama Setup:
1. Install Ollama: https://ollama.ai
2. Pull a model: `ollama pull llama3.2`
3. Start Ollama service
4. Use the configuration:
```bash
LLM_PROVIDER="ollama"
LLM_API_KEY_ENV_VAR=""  # Not needed for Ollama
LLM_BASE_URL="http://localhost:11434"
LLM_MODEL="llama3.2"
```

## Usage Workflow

### 1. Create Data Agent
- Go to `/admin/data-agents`
- Click "Create Data Agent"
- Configure database connection details
- Store credentials in your vault (HashiCorp Vault, Azure KeyVault, etc.)

### 2. Test Connections
- **Test Database Connection**: Verify database connectivity
- **Test LLM Connection**: Verify AI model access
- Both tests available in the data agent details page

### 3. Import Tables
- Click "Import Tables" in the data agent details
- System automatically discovers all tables in your database
- Select which tables to import
- Table schema and fields are automatically imported

### 4. Analyze Tables
- Click "Analyze" button on any imported table
- LLM will analyze:
  - Table purpose and business domain
  - Field meanings and patterns
  - Data quality observations
  - Usage recommendations
  - Potential relationships

### 5. View Detailed Analysis
- Click "View Details" on any table
- See field-by-field AI analysis
- Edit field descriptions
- View sample data values
- Monitor analysis status

## API Endpoints

### Data Agent Management
- `GET /api/admin/data-agents` - List all data agents
- `GET /api/admin/data-agents/[id]` - Get specific data agent
- `POST /api/admin/data-agents/[id]/test-connection` - Test database connection

### Table Operations
- `GET /api/admin/data-agents/[id]/tables/available` - Get available tables from database
- `POST /api/admin/data-agents/[id]/tables/import` - Import selected tables
- `POST /api/admin/data-agents/tables/[id]/analyze` - Analyze table with LLM
- `GET /api/admin/data-agents/tables/[id]` - Get table details
- `PATCH /api/admin/data-agents/tables/columns/[id]` - Update column description

### LLM Operations  
- `POST /api/admin/llm/test` - Test LLM connection

## Database Schema

The system uses these main models:
- `DataAgent` - Database connection configuration
- `DataAgentTable` - Imported table metadata
- `DataAgentTableColumn` - Field/column details with AI analysis
- `DataAgentRelation` - Discovered relationships between tables

## Features Implemented

✅ **Database Connectivity**
- All major database types supported
- Connection testing with proper error handling
- Credential management via vault systems

✅ **LLM Integration**
- OpenAI and Ollama support
- Configurable via environment variables
- Connection testing
- Table and field analysis

✅ **Table Management**
- Automatic schema discovery
- Bulk table import
- Real-time analysis status
- Sample data collection

✅ **AI Analysis**
- Table purpose analysis
- Field-level descriptions
- Data pattern recognition
- Business context understanding

✅ **User Interface**
- Modern card-based layouts
- Real-time status updates
- Inline editing capabilities
- Professional design system

## Next Steps

To extend the system:
1. **Relationship Discovery**: Implement automatic foreign key detection
2. **Query Generation**: LLM-powered SQL query suggestions
3. **Data Lineage**: Track data flow between tables
4. **Custom Analysis**: User-defined analysis prompts
5. **Scheduling**: Automated periodic analysis updates

## Troubleshooting

### Database Connection Issues
- Verify credentials in vault
- Check network connectivity
- Ensure database allows connections from application

### LLM Connection Issues
- For Ollama: Ensure service is running on correct port
- For OpenAI: Verify API key is valid
- Check firewall/proxy settings

### Analysis Not Working
- Verify LLM configuration
- Check table import completed successfully
- Ensure sample data is available
